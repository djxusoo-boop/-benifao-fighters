import AppKit
import ImageIO
import Vision

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let atlasURL = root.appendingPathComponent("public/assets/new-fighters/tonimassama-action-atlas-v2.png")
let frameDirectory = root.appendingPathComponent("public/assets/new-fighters/tonimassama-frames", isDirectory: true)
let frameNames = [
  ["idle", "walk-a", "walk-b"],
  ["walk-c", "guard", "jump"],
  ["crouch", "hit", "getup"],
  ["punch", "kick", "pistol"],
]

func cgImage(_ url: URL) throws -> CGImage {
  guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
        let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
    throw NSError(domain: "ToniFrames", code: 1, userInfo: [NSLocalizedDescriptionKey: "Cannot read \(url.path)"])
  }
  return image
}

func cutout(_ image: CGImage) throws -> CGImage {
  let handler = VNImageRequestHandler(cgImage: image)
  let request = VNGenerateForegroundInstanceMaskRequest()
  try handler.perform([request])
  guard let result = request.results?.first else {
    throw NSError(domain: "ToniFrames", code: 2, userInfo: [NSLocalizedDescriptionKey: "Vision did not find the character"])
  }
  let maskBuffer = try result.generateScaledMaskForImage(forInstances: result.allInstances, from: handler)
  let width = image.width
  let height = image.height
  guard CVPixelBufferGetWidth(maskBuffer) == width, CVPixelBufferGetHeight(maskBuffer) == height else {
    throw NSError(domain: "ToniFrames", code: 3, userInfo: [NSLocalizedDescriptionKey: "Foreground mask dimensions do not match the pose"])
  }
  var rgba = Data(count: width * height * 4)
  let colorSpace = CGColorSpaceCreateDeviceRGB()
  let sourceContext = rgba.withUnsafeMutableBytes { bytes -> CGContext? in
    guard let context = CGContext(data: bytes.baseAddress, width: width, height: height, bitsPerComponent: 8, bytesPerRow: width * 4, space: colorSpace, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue | CGBitmapInfo.byteOrder32Big.rawValue) else { return nil }
    context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
    return context
  }
  guard sourceContext != nil else {
    throw NSError(domain: "ToniFrames", code: 4, userInfo: [NSLocalizedDescriptionKey: "Could not read pose pixels"])
  }
  CVPixelBufferLockBaseAddress(maskBuffer, .readOnly)
  defer { CVPixelBufferUnlockBaseAddress(maskBuffer, .readOnly) }
  guard let maskBase = CVPixelBufferGetBaseAddress(maskBuffer) else {
    throw NSError(domain: "ToniFrames", code: 5, userInfo: [NSLocalizedDescriptionKey: "Foreground mask has no pixel data"])
  }
  let maskBytes = maskBase.assumingMemoryBound(to: UInt8.self)
  let maskStride = CVPixelBufferGetBytesPerRow(maskBuffer)
  rgba.withUnsafeMutableBytes { bytes in
    guard let pixels = bytes.baseAddress?.assumingMemoryBound(to: UInt8.self) else { return }
    for y in 0..<height {
      for x in 0..<width {
        let pixel = (y * width + x) * 4
        let alpha = maskBytes[y * maskStride + x]
        pixels[pixel + 3] = alpha
        if alpha == 0 {
          pixels[pixel] = 0
          pixels[pixel + 1] = 0
          pixels[pixel + 2] = 0
        }
      }
    }
  }
  guard let provider = CGDataProvider(data: rgba as CFData),
        let output = CGImage(width: width, height: height, bitsPerComponent: 8, bitsPerPixel: 32, bytesPerRow: width * 4, space: colorSpace, bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.premultipliedLast.rawValue | CGBitmapInfo.byteOrder32Big.rawValue), provider: provider, decode: nil, shouldInterpolate: true, intent: .defaultIntent) else {
    throw NSError(domain: "ToniFrames", code: 6, userInfo: [NSLocalizedDescriptionKey: "Could not encode masked pose"])
  }
  return output
}

func save(_ image: CGImage, to url: URL) throws {
  guard let destination = CGImageDestinationCreateWithURL(url as CFURL, "public.png" as CFString, 1, nil) else {
    throw NSError(domain: "ToniFrames", code: 4, userInfo: [NSLocalizedDescriptionKey: "Cannot write \(url.path)"])
  }
  CGImageDestinationAddImage(destination, image, nil)
  guard CGImageDestinationFinalize(destination) else {
    throw NSError(domain: "ToniFrames", code: 5, userInfo: [NSLocalizedDescriptionKey: "Failed to finish \(url.path)"])
  }
}

try FileManager.default.createDirectory(at: frameDirectory, withIntermediateDirectories: true)
let atlas = try cgImage(atlasURL)
guard atlas.width == 1024 && atlas.height == 1536 else {
  throw NSError(domain: "ToniFrames", code: 6, userInfo: [NSLocalizedDescriptionKey: "Expected a 1024x1536 action atlas, got \(atlas.width)x\(atlas.height)"])
}

let xStarts = [0, 341, 683]
let widths = [341, 342, 341]
let yStarts = [0, 384, 768, 1152]
let rowHeights = [384, 384, 384, 384]
var saved = 0

for row in 0..<4 {
  for column in 0..<3 {
    let rect = CGRect(x: xStarts[column], y: yStarts[row], width: widths[column], height: rowHeights[row])
    guard let cell = atlas.cropping(to: rect) else { continue }
    let transparent = try cutout(cell)
    let outputURL = frameDirectory.appendingPathComponent("\(frameNames[row][column]).png")
    try save(transparent, to: outputURL)
    saved += 1
  }
}

print("Wrote \(saved) foreground-masked Toni poses from the v2 atlas.")
