#!/usr/bin/env swift

import CoreGraphics
import CoreImage
import Foundation
import Vision

let fileManager = FileManager.default
let projectRoot = URL(fileURLWithPath: #filePath)
    .deletingLastPathComponent()
    .deletingLastPathComponent()
let assetDirectory = projectRoot
    .appendingPathComponent("public")
    .appendingPathComponent("assets")
    .appendingPathComponent("mobile")

let sourceNames = try fileManager.contentsOfDirectory(atPath: assetDirectory.path)
    .filter { name in
        let isCrowdPose = name.hasPrefix("crowd-") && name.hasSuffix(".jpg")
        let isLegacySprite = name.hasPrefix("spectator-") && name.hasSuffix("-sprite-v1.jpg")
        return isCrowdPose || isLegacySprite
    }
    .sorted()

guard !sourceNames.isEmpty else {
    fatalError("No crowd JPG assets found")
}

let context = CIContext(options: [.cacheIntermediates: false])
let colorSpace = CGColorSpaceCreateDeviceRGB()

for sourceName in sourceNames {
    autoreleasepool {
        do {
            let sourceURL = assetDirectory.appendingPathComponent(sourceName)
            guard let source = CIImage(
                contentsOf: sourceURL,
                options: [.applyOrientationProperty: true]
            ) else {
                throw NSError(domain: "CrowdCutout", code: 1, userInfo: [
                    NSLocalizedDescriptionKey: "Could not load \(sourceName)"
                ])
            }

            let handler = VNImageRequestHandler(ciImage: source, options: [:])
            let maskBuffer: CVPixelBuffer

            if sourceName.contains("crowd-rainbow-") {
                // The rainbow mascot is not anatomically human, so foreground
                // instance segmentation retains its shirt, limbs and flyer.
                let request = VNGenerateForegroundInstanceMaskRequest()
                try handler.perform([request])
                guard let observation = request.results?.first else {
                    throw NSError(domain: "CrowdCutout", code: 2, userInfo: [
                        NSLocalizedDescriptionKey: "No foreground mask found in \(sourceName)"
                    ])
                }
                maskBuffer = try observation.generateScaledMaskForImage(
                    forInstances: observation.allInstances,
                    from: handler
                )
            } else {
                let request = VNGeneratePersonSegmentationRequest()
                request.qualityLevel = .accurate
                request.outputPixelFormat = kCVPixelFormatType_OneComponent8
                try handler.perform([request])
                guard let observation = request.results?.first else {
                    throw NSError(domain: "CrowdCutout", code: 3, userInfo: [
                        NSLocalizedDescriptionKey: "No person mask found in \(sourceName)"
                    ])
                }
                maskBuffer = observation.pixelBuffer
            }

            var mask = CIImage(cvPixelBuffer: maskBuffer)
            let scaleX = source.extent.width / mask.extent.width
            let scaleY = source.extent.height / mask.extent.height
            mask = mask
                .transformed(by: CGAffineTransform(scaleX: scaleX, y: scaleY))
                .cropped(to: source.extent)

            // A very small feather keeps hair and fingers natural without the
            // large pale halo that the original JPEG background produced.
            mask = mask
                .applyingFilter("CIGaussianBlur", parameters: [kCIInputRadiusKey: 0.45])
                .cropped(to: source.extent)

            let transparent = CIImage(color: .clear).cropped(to: source.extent)
            let cutout = source.applyingFilter("CIBlendWithMask", parameters: [
                kCIInputBackgroundImageKey: transparent,
                kCIInputMaskImageKey: mask,
            ])

            let outputURL = sourceURL.deletingPathExtension().appendingPathExtension("png")
            try context.writePNGRepresentation(
                of: cutout,
                to: outputURL,
                format: .RGBA8,
                colorSpace: colorSpace
            )
            print("\(sourceName) -> \(outputURL.lastPathComponent)")
        } catch {
            fputs("Background extraction failed for \(sourceName): \(error)\n", stderr)
            exit(1)
        }
    }
}
