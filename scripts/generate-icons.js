// Simple icon generator for PWA
// This creates basic icons for the Link Manager app

const fs = require('fs')
const path = require('path')

const sizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512]

const svgTemplate = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#000000" rx="${size * 0.2}"/>
  <g fill="white" transform="translate(${size * 0.2}, ${size * 0.2})">
    <rect x="0" y="0" width="${size * 0.15}" height="${size * 0.4}" rx="${size * 0.02}"/>
    <rect x="${size * 0.2}" y="0" width="${size * 0.15}" height="${size * 0.25}" rx="${size * 0.02}"/>
    <rect x="${size * 0.4}" y="0" width="${size * 0.15}" height="${size * 0.3}" rx="${size * 0.02}"/>
    <circle cx="${size * 0.075}" cy="${size * 0.5}" r="${size * 0.03}"/>
    <circle cx="${size * 0.275}" cy="${size * 0.35}" r="${size * 0.03}"/>
    <circle cx="${size * 0.475}" cy="${size * 0.4}" r="${size * 0.03}"/>
  </g>
</svg>
`

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, '..', 'public')
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true })
}

// Generate icons
sizes.forEach(size => {
  const svg = svgTemplate(size)
  const filename = `icon-${size}x${size}.png`
  
  // For this simple version, we'll create SVG files
  // In a real project, you'd use a proper SVG to PNG converter
  const svgFilename = `icon-${size}x${size}.svg`
  fs.writeFileSync(path.join(publicDir, svgFilename), svg.trim())
  
  console.log(`Generated ${svgFilename}`)
})

// Generate favicon.ico (just copy the 32x32 for simplicity)
fs.copyFileSync(
  path.join(publicDir, 'icon-32x32.svg'),
  path.join(publicDir, 'favicon.ico')
)

console.log('Icon generation complete!')
console.log('Note: For production, convert SVG files to PNG format.') 