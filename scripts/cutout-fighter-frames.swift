import AppKit
import ImageIO
import Vision

let arguments = Array(CommandLine.arguments.dropFirst())
guard !arguments.isEmpty, arguments.count.isMultiple(of: 2) else {
  fatalError("Usage: swift cutout-fighter-frames.swift <input> <output> [<input> <output> ...]")
}

func loadImage(_ path: String) throws -> CGImage {
  let url = URL(fileURLWithPath: path)
  guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
        let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
    throw NSError(domain: "FighterCutout", code: 1, userInfo: [NSLocalizedDescriptionKey: "Cannot read image: \(path)"])
  }
  return image
}

func cutout(_ image: CGImage) throws -> CGImage {
  let handler = VNImageRequestHandler(cgImage: image)
  let request = VNGenerateForegroundInstanceMaskRequest()
  try handler.perform([request])
  guard let result = request.results?.first else {
    throw NSError(domain: "FighterCutout", code: 2, userInfo: [NSLocalizedDescriptionKey: "Vision found no foreground subject"])
  }
  let mask = try result.generateScaledMaskForImage(forInstances: result.allInstances, from: handler)
  let width = image.width
  let height = image.height
  var pixels = Data(count: width * height * 4)
  let colorSpace = CGColorSpaceCreateDeviceRGB()
  let context = pixels.withUnsafeMutableBytes { bytes -> CGContext? in
    guard let context = CGContext(data: bytes.baseAddress, width: width, height: height, bitsPerComponent: 8, bytesPerRow: width * 4, space: colorSpace, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue | CGBitmapInfo.byteOrder32Big.rawValue) else { return nil }
    context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
    return context
  }
  guard context != nil else {
    throw NSError(domain: "FighterCutout", code: 3, userInfo: [NSLocalizedDescriptionKey: "Could not read image pixels"])
  }
  CVPixelBufferLockBaseAddress(mask, .readOnly)
  defer { CVPixelBufferUnlockBaseAddress(mask, .readOnly) }
  guard let maskBase = CVPixelBufferGetBaseAddress(mask) else {
    throw NSError(domain: "FighterCutout", code: 4, userInfo: [NSLocalizedDescriptionKey: "Vision mask is empty"])
  }
  let maskBytes = maskBase.assumingMemoryBound(to: UInt8.self)
  let maskStride = CVPixelBufferGetBytesPerRow(mask)
  pixels.withUnsafeMutableBytes { bytes in
    guard let rgba = bytes.baseAddress?.assumingMemoryBound(to: UInt8.self) else { return }
    for y in 0..<height {
      for x in 0..<width {
        let i = (y * width + x) * 4
        let alpha = maskBytes[y * maskStride + x]
        rgba[i + 3] = alpha
        if alpha == 0 {
          rgba[i] = 0
          rgba[i + 1] = 0
          rgba[i + 2] = 0
        }
      }
    }
  }
  guard let provider = CGDataProvider(data: pixels as CFData),
        let output = CGImage(width: width, height: height, bitsPerComponent: 8, bitsPerPixel: 32, bytesPerRow: width * 4, space: colorSpace, bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.premultipliedLast.rawValue | CGBitmapInfo.byteOrder32Big.rawValue), provider: provider, decode: nil, shouldInterpolate: true, intent: .defaultIntent) else {
    throw NSError(domain: "FighterCutout", code: 5, userInfo: [NSLocalizedDescriptionKey: "Could not encode output"])
  }
  return output
}

func save(_ image: CGImage, path: String) throws {
  let url = URL(fileURLWithPath: path)
  try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
  guard let destination = CGImageDestinationCreateWithURL(url as CFURL, "public.png" as CFString, 1, nil) else {
    throw NSError(domain: "FighterCutout", code: 6, userInfo: [NSLocalizedDescriptionKey: "Cannot write image: \(path)"])
  }
  CGImageDestinationAddImage(destination, image, nil)
  guard CGImageDestinationFinalize(destination) else {
    throw NSError(domain: "FighterCutout", code: 7, userInfo: [NSLocalizedDescriptionKey: "Failed to finish image: \(path)"])
  }
}

for i in stride(from: 0, to: arguments.count, by: 2) {
  let input = arguments[i]
  let output = arguments[i + 1]
  try save(cutout(loadImage(input)), path: output)
  print("Cut out \(URL(fileURLWithPath: input).lastPathComponent) -> \(URL(fileURLWithPath: output).lastPathComponent)")
}
