import React, { useState, useRef, useEffect } from 'react';
import JSZip from 'jszip';
import toast from 'react-hot-toast';

interface ImageData {
  number: number;
  dataUrl: string;
}

const NumberGenerator: React.FC = () => {
  const [imageWidth, setImageWidth] = useState<number>(300);
  const [imageHeight, setImageHeight] = useState<number>(300);
  const [inputWidth, setInputWidth] = useState<string>('300');
  const [inputHeight, setInputHeight] = useState<string>('300');
  const [aspectRatio, setAspectRatio] = useState<number>(1);
  const [inputAspectRatio, setInputAspectRatio] = useState<string>('1');
  const [isAspectRatioLocked, setIsAspectRatioLocked] = useState<boolean>(true);
  const [numRows, setNumRows] = useState<number>(5);
  const [numColumns, setNumColumns] = useState<number>(4);
  const [inputNumRows, setInputNumRows] = useState<string>('5');
  const [inputNumColumns, setInputNumColumns] = useState<string>('4');
  const [backgroundColor, setBackgroundColor] = useState<string>('#FFFFFF');
  const [secondaryBackgroundColor, setSecondaryBackgroundColor] = useState<string>('#CCCCCC');
  const [backgroundPattern, setBackgroundPattern] = useState<'unified' | 'checkerboard' | 'large-checkerboard'>('unified');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [allImages, setAllImages] = useState<ImageData[]>([]);
  const [stitchedPreviewUrl, setStitchedPreviewUrl] = useState<string>('');
  
  // Function to find the greatest common divisor
  const gcd = (a: number, b: number): number => {
    return b === 0 ? a : gcd(b, a % b);
  };

  // Function to get simplified aspect ratio
  const getSimplifiedAspectRatio = (): string => {
    const width = parseInt(inputWidth);
    const height = parseInt(inputHeight);
    
    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
      return '1:1';
    }
    
    const divisor = gcd(width, height);
    return `${width / divisor}:${height / divisor}`;
  };

  // Function to calculate text color based on background color
  const getTextColor = (bgColor: string): string => {
    // Convert hex to RGB
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return black for light backgrounds, white for dark backgrounds
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  };

  const generateImage = (number: number, index: number): string => {
    const canvas = canvasRef.current;
    if (!canvas) return '';
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    
    // Get device pixel ratio
    const dpr = window.devicePixelRatio || 1;
    
    // Set canvas size in CSS pixels
    canvas.style.width = `${imageWidth}px`;
    canvas.style.height = `${imageHeight}px`;
    
    // Set canvas size in actual pixels
    canvas.width = imageWidth * dpr;
    canvas.height = imageHeight * dpr;
    
    // Scale context to account for device pixel ratio
    ctx.scale(dpr, dpr);

    // Calculate row and column positions
    const rowIndex = Math.floor(index / numColumns) + 1;
    const colIndex = (index % numColumns) + 1;
    
    // Clear canvas with selected background pattern
    if (backgroundPattern === 'unified') {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, imageWidth, imageHeight);
    } else if (backgroundPattern === 'checkerboard') {
      // Create checkerboard pattern
      const tileSize = Math.min(imageWidth, imageHeight) / 8; // 8x8 checkerboard
      for (let y = 0; y < imageHeight; y += tileSize) {
        for (let x = 0; x < imageWidth; x += tileSize) {
          const isEvenTile = ((x / tileSize) + (y / tileSize)) % 2 === 0;
          ctx.fillStyle = isEvenTile ? backgroundColor : secondaryBackgroundColor;
          ctx.fillRect(x, y, tileSize, tileSize);
        }
      }
    } else {
      // Large checkerboard pattern - alternate colors based on row and column position
      const isEvenTile = (Math.floor(index / numColumns) + (index % numColumns)) % 2 === 0;
      ctx.fillStyle = isEvenTile ? backgroundColor : secondaryBackgroundColor;
      ctx.fillRect(0, 0, imageWidth, imageHeight);
    }
    
    // Draw number
    ctx.fillStyle = backgroundPattern === 'unified' 
      ? getTextColor(backgroundColor)
      : backgroundPattern === 'checkerboard'
        ? getTextColor(backgroundColor)
        : getTextColor((rowIndex - 1 + colIndex - 1) % 2 === 0 ? backgroundColor : secondaryBackgroundColor);
    const fontSize = Math.min(imageWidth, imageHeight) * 0.5;
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(number.toString(), imageWidth / 2, imageHeight / 2);
    
    // Add border
    ctx.strokeStyle = '#333';
    const borderWidth = Math.max(5, Math.min(imageWidth, imageHeight) * 0.016);
    ctx.lineWidth = borderWidth;
    
    // Draw border with half the line width offset to ensure perfect alignment
    ctx.strokeRect(
      borderWidth / 2,
      borderWidth / 2,
      imageWidth - borderWidth,
      imageHeight - borderWidth
    );

    // Draw row/column and size info with smaller text
    ctx.fillStyle = backgroundPattern === 'unified'
      ? getTextColor(backgroundColor)
      : backgroundPattern === 'checkerboard'
        ? getTextColor(backgroundColor)
        : getTextColor((rowIndex - 1 + colIndex - 1) % 2 === 0 ? backgroundColor : secondaryBackgroundColor);
    ctx.globalAlpha = 0.8;
    const smallFontSize = Math.min(imageWidth, imageHeight) * 0.08;
    ctx.font = `${smallFontSize}px Arial`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    // Position text in the top-left corner with some padding
    const padding = Math.max(10, Math.min(imageWidth, imageHeight) * 0.03);
    ctx.fillText(`R${rowIndex} C${colIndex}`, padding, padding);
    ctx.fillText(`${imageWidth}×${imageHeight}`, padding, padding + smallFontSize + 2);
    
    return canvas.toDataURL('image/png');
  };
  
  // Generate all images
//   const generateAllImages = (): ImageData[] => {
//     const images: ImageData[] = [];
//     const totalImages = numRows * numColumns;
//     for (let i = 1; i <= totalImages; i++) {
//       images.push({
//         number: i,
//         dataUrl: generateImage(i, i - 1)
//       });
//     }
//     return images;
//   };

  const downloadAllImages = async () => {
    // Create a zip file
    const zip = new JSZip();
    
    // Add each image to the zip
    allImages.forEach((img) => {
      // Convert base64 to blob
      const base64Data = img.dataUrl.split(',')[1];
      const binaryData = atob(base64Data);
      const array = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        array[i] = binaryData.charCodeAt(i);
      }
      
      // Add to zip with size in filename
      zip.file(`number-${img.number}-${imageWidth}x${imageHeight}px.png`, array);
    });
    
    // Generate and download zip with size in filename
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = `number-images-${imageWidth}x${imageHeight}px.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newWidth = parseInt(e.target.value);
    setInputWidth(e.target.value);
    
    if (isAspectRatioLocked && !isNaN(newWidth)) {
      // When aspect ratio is locked, calculate new height based on the current aspect ratio
      const newHeight = Math.round(newWidth / aspectRatio);
      setImageHeight(newHeight);
      setInputHeight(newHeight.toString());
      setImageWidth(newWidth);
    } else if (!isNaN(newWidth)) {
      // Update aspect ratio based on current height
      const currentHeight = parseInt(inputHeight);
      if (!isNaN(currentHeight) && currentHeight > 0) {
        const newRatio = newWidth / currentHeight;
        setAspectRatio(newRatio);
        setInputAspectRatio(newRatio.toFixed(1));
        setImageWidth(newWidth);
      }
    }
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHeight = parseInt(e.target.value);
    setInputHeight(e.target.value);
    
    if (isAspectRatioLocked && !isNaN(newHeight)) {
      // When aspect ratio is locked, calculate new width based on the current aspect ratio
      const newWidth = Math.round(newHeight * aspectRatio);
      setImageWidth(newWidth);
      setInputWidth(newWidth.toString());
      setImageHeight(newHeight);
    } else if (!isNaN(newHeight)) {
      // Update aspect ratio based on current width
      const currentWidth = parseInt(inputWidth);
      if (!isNaN(currentWidth) && currentWidth > 0) {
        const newRatio = currentWidth / newHeight;
        setAspectRatio(newRatio);
        setInputAspectRatio(newRatio.toFixed(1));
        setImageHeight(newHeight);
      }
    }
  };

  const handleAspectRatioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newRatio = parseFloat(e.target.value);
    setInputAspectRatio(e.target.value);
    
    if (!isNaN(newRatio) && newRatio > 0) {
      setAspectRatio(newRatio);
      if (isAspectRatioLocked) {
        const newHeight = Math.round(imageWidth / newRatio);
        setImageHeight(newHeight);
        setInputHeight(newHeight.toString());
      }
    }
  };

  const handleAspectRatioLockChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsAspectRatioLocked(e.target.checked);
    if (e.target.checked) {
      // When locking, calculate aspect ratio from current dimensions
      const currentWidth = parseInt(inputWidth);
      const currentHeight = parseInt(inputHeight);
      if (!isNaN(currentWidth) && !isNaN(currentHeight) && currentHeight > 0) {
        const newRatio = currentWidth / currentHeight;
        setAspectRatio(newRatio);
        setInputAspectRatio(newRatio.toFixed(1));
      }
    }
  };

  const handleRegenerate = () => {
    const newWidth = parseInt(inputWidth);
    const newHeight = parseInt(inputHeight);
    const newNumRows = parseInt(inputNumRows);
    const newNumColumns = parseInt(inputNumColumns);

    // Validate dimensions
    if (isNaN(newWidth) || isNaN(newHeight)) {
      toast.error('Please enter valid width and height');
      return;
    }
    if (newWidth < 100) {
      toast.error('Width must be at least 100px');
      return;
    }
    if (newHeight < 100) {
      toast.error('Height must be at least 100px');
      return;
    }
    if (newWidth > 5000) {
      toast.error('Width must be at most 5000px');
      return;
    }
    if (newHeight > 5000) {
      toast.error('Height must be at most 5000px');
      return;
    }

    // Validate rows and columns
    if (isNaN(newNumRows) || isNaN(newNumColumns)) {
      toast.error('Please enter valid number of rows and columns');
      return;
    }
    if (newNumRows < 1) {
      toast.error('Number of rows must be at least 1');
      return;
    }
    if (newNumColumns < 1) {
      toast.error('Number of columns must be at least 1');
      return;
    }
    if (newNumRows * newNumColumns > 100) {
      toast.error('Cannot generate more than 100 images at once');
      return;
    }
    
    setImageWidth(newWidth);
    setImageHeight(newHeight);
    setNumRows(newNumRows);
    setNumColumns(newNumColumns);
    generateStitchedPreview(); // Generate preview after updating all settings
    toast.success(`Images regenerated: ${newNumRows} rows × ${newNumColumns} columns at ${newWidth}x${newHeight}px`);
  };
  
  // Update images when rows or columns change
  useEffect(() => {
    const newNumRows = parseInt(inputNumRows);
    const newNumColumns = parseInt(inputNumColumns);
    
    if (!isNaN(newNumRows) && !isNaN(newNumColumns) && 
        newNumRows >= 1 && newNumColumns >= 1 && 
        newNumRows * newNumColumns <= 100) {
      setNumRows(newNumRows);
      setNumColumns(newNumColumns);
      // Generate new images with the updated dimensions
      const newImages: ImageData[] = [];
      const totalImages = newNumRows * newNumColumns;
      for (let i = 1; i <= totalImages; i++) {
        newImages.push({
          number: i,
          dataUrl: generateImage(i, i - 1)
        });
      }
      setAllImages(newImages);
    }
  }, [inputNumRows, inputNumColumns, imageWidth, imageHeight]);

  // Update images when dimensions or background settings change
  useEffect(() => {
    const newImages: ImageData[] = [];
    const totalImages = numRows * numColumns;
    for (let i = 1; i <= totalImages; i++) {
      newImages.push({
        number: i,
        dataUrl: generateImage(i, i - 1)
      });
    }
    setAllImages(newImages);
  }, [imageWidth, imageHeight, backgroundColor, secondaryBackgroundColor, backgroundPattern]);

  // Function to generate the stitched preview
  const generateStitchedPreview = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate total dimensions
    const totalWidth = imageWidth * numColumns;
    const totalHeight = imageHeight * numRows;

    // Set canvas size to total dimensions
    canvas.width = totalWidth;
    canvas.height = totalHeight;

    // Draw each image in its position
    allImages.forEach((img, index) => {
      const row = Math.floor(index / numColumns);
      const col = index % numColumns;
      const x = col * imageWidth;
      const y = row * imageHeight;

      const tempImg = new Image();
      tempImg.src = img.dataUrl;
      ctx.drawImage(tempImg, x, y, imageWidth, imageHeight);
    });

    setStitchedPreviewUrl(canvas.toDataURL('image/png'));
  };

  // Calculate preview scale
  const calculatePreviewScale = () => {
    const totalWidth = imageWidth * numColumns;
    const totalHeight = imageHeight * numRows;
    
    // Get container width (assuming it's the parent div's width)
    const containerWidth = window.innerWidth - 64; // Account for padding
    const containerHeight = window.innerHeight - 400; // Account for other UI elements
    
    // Calculate scale factors for both width and height
    const scaleX = containerWidth / totalWidth;
    const scaleY = containerHeight / totalHeight;
    
    // Use the smaller scale to ensure the preview fits both dimensions
    return Math.min(scaleX, scaleY, 1); // Don't scale up, only down
  };

  // Calculate preview dimensions
  const getPreviewDimensions = () => {
    const totalWidth = imageWidth * numColumns;
    const totalHeight = imageHeight * numRows;
    const scale = calculatePreviewScale();
    
    return {
      width: totalWidth * scale,
      height: totalHeight * scale
    };
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Number Images Generator</h1>
        <button
          onClick={downloadAllImages}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          Download All
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-col gap-6">
          {/* Layout Settings Section */}
          <div className="border-b border-gray-200 pb-4">
            <h2 className="text-lg font-semibold mb-3">Layout Settings</h2>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <label htmlFor="numRows" className="text-sm font-medium text-gray-700">
                  Number of Rows:
                </label>
                <input
                  type="number"
                  id="numRows"
                  value={inputNumRows}
                  onChange={(e) => setInputNumRows(e.target.value)}
                  min="1"
                  max="10"
                  className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="numColumns" className="text-sm font-medium text-gray-700">
                  Number of Columns:
                </label>
                <input
                  type="number"
                  id="numColumns"
                  value={inputNumColumns}
                  onChange={(e) => setInputNumColumns(e.target.value)}
                  min="1"
                  max="10"
                  className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Image Dimensions Section */}
          <div className="border-b border-gray-200 pb-4">
            <h2 className="text-lg font-semibold mb-3">Image Dimensions</h2>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <label htmlFor="imageWidth" className="text-sm font-medium text-gray-700">
                  Width (px):
                </label>
                <input
                  type="number"
                  id="imageWidth"
                  value={inputWidth}
                  onChange={handleWidthChange}
                  min="100"
                  max="5000"
                  step="1"
                  className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="imageHeight" className="text-sm font-medium text-gray-700">
                  Height (px):
                </label>
                <input
                  type="number"
                  id="imageHeight"
                  value={inputHeight}
                  onChange={handleHeightChange}
                  min="100"
                  max="5000"
                  step="1"
                  className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="aspectRatio" className="text-sm font-medium text-gray-700">
                  Aspect Ratio:
                </label>
                <input
                  type="number"
                  id="aspectRatio"
                  value={inputAspectRatio}
                  onChange={handleAspectRatioChange}
                  min="0.1"
                  max="10"
                  step="0.1"
                  className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="text-sm text-gray-600">
                  ({getSimplifiedAspectRatio()})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="lockAspectRatio"
                  checked={isAspectRatioLocked}
                  onChange={handleAspectRatioLockChange}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="lockAspectRatio" className="text-sm font-medium text-gray-700">
                  Lock Aspect Ratio
                </label>
              </div>
            </div>
          </div>

          {/* Background Settings Section */}
          <div className="border-b border-gray-200 pb-4">
            <h2 className="text-lg font-semibold mb-3">Background Settings</h2>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <label htmlFor="backgroundColor" className="text-sm font-medium text-gray-700">
                  Primary Color:
                </label>
                <input
                  type="color"
                  id="backgroundColor"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="w-12 h-8 p-0 border border-gray-300 rounded cursor-pointer"
                />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {backgroundColor}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">Text Color:</span>
                    <div 
                      className="w-8 h-6 border border-gray-300 rounded"
                      style={{ backgroundColor: getTextColor(backgroundColor) }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="secondaryBackgroundColor" className="text-sm font-medium text-gray-700">
                  Secondary Color:
                </label>
                <input
                  type="color"
                  id="secondaryBackgroundColor"
                  value={secondaryBackgroundColor}
                  onChange={(e) => setSecondaryBackgroundColor(e.target.value)}
                  className="w-12 h-8 p-0 border border-gray-300 rounded cursor-pointer"
                />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {secondaryBackgroundColor}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">Text Color:</span>
                    <div 
                      className="w-8 h-6 border border-gray-300 rounded"
                      style={{ backgroundColor: getTextColor(secondaryBackgroundColor) }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="backgroundPattern" className="text-sm font-medium text-gray-700">
                  Pattern:
                </label>
                <select
                  id="backgroundPattern"
                  value={backgroundPattern}
                  onChange={(e) => setBackgroundPattern(e.target.value as 'unified' | 'checkerboard' | 'large-checkerboard')}
                  className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="unified">Unified</option>
                  <option value="checkerboard">Checkerboard</option>
                  <option value="large-checkerboard">Large Checkerboard</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Regenerate Button */}
      <div className="flex justify-center mb-6">
        <button
          onClick={handleRegenerate}
          className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-lg font-medium"
        >
          Regenerate Stitched Images
        </button>
      </div>
      
      <div className="text-sm text-gray-600 mb-4">
        Layout: {numRows} rows × {numColumns} columns | Size: {imageWidth} x {imageHeight} pixels
      </div>
      
      <canvas 
        ref={canvasRef} 
        width={imageWidth} 
        height={imageHeight} 
        className="hidden"
      />
      
      <div className="flex justify-center">
        <div className={`grid gap-4 max-w-[90vw]`} style={{ gridTemplateColumns: `repeat(${numColumns}, 1fr)` }}>
          {allImages.map((img, index) => {
            const row = Math.floor(index / numColumns) + 1;
            const col = (index % numColumns) + 1;
            return (
              <div key={img.number} className="border border-gray-300 p-2 rounded bg-white">
                <div className="font-bold text-center mb-2">Number {img.number}</div>
                <img 
                  src={img.dataUrl} 
                  alt={`Number ${img.number}`} 
                  width={imageWidth} 
                  height={imageHeight}
                  className="w-full h-auto"
                />
                <div className="mt-2 text-center space-y-1">
                  <div className="text-xs text-gray-600">
                    Row: {row}, Col: {col}
                  </div>
                  <div className="text-xs text-gray-600">
                    Size: {imageWidth} × {imageHeight}px
                  </div>
                  <a 
                    href={img.dataUrl} 
                    download={`number-${img.number}-${imageWidth}x${imageHeight}px.png`}
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm inline-block"
                  >
                    Download
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stitched Preview Section */}
      <div className="mt-8 w-full">
        <h2 className="text-xl font-bold mb-4 text-center">Stitched Preview</h2>
        <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-200 w-full max-w-[90vw] mx-auto">
          <div className="text-sm text-gray-600 mb-2 text-center">
            This is how your images would look when stitched together in the current layout
          </div>
          <div className="flex items-center justify-center w-full">
            <div style={{ width: getPreviewDimensions().width, height: getPreviewDimensions().height }}>
              <img
                src={stitchedPreviewUrl}
                alt="Stitched preview"
                className="border border-gray-300"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NumberGenerator;