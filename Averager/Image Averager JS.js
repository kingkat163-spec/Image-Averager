let uploadedFiles = [];

const dropzone = document.getElementById('dropzone');
const input = document.getElementById('Image-Input');
const gallery = document.getElementById('gallery');
const ProcessImages = document.getElementById('ProcessImages')
const DownloadOutput = document.getElementById('DownloadOutput')

function handleFiles(fileList) {
  const newFiles = Array.from(fileList).filter(f => f.type.startsWith('image/'));
uploadedFiles = uploadedFiles.concat(newFiles);

  gallery.innerHTML = '';

  uploadedFiles.forEach(file => {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'width:120px; text-align:center; font-size:12px;';

    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.style.cssText = 'width:120px; height:120px; object-fit:cover; border-radius:8px; display:block;';

    const label = document.createElement('div');
    label.textContent = file.name;
    label.style.cssText = 'margin-top:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';

    wrapper.appendChild(img);
    wrapper.appendChild(label);
    gallery.appendChild(wrapper);
  });

  if (uploadedFiles.length > 0) {
    gallery.innerHTML += `<div>Here are the images you uploaded, to process just press the button.</div>`;
  } else {
    gallery.innerHTML += `<div>Add images and press the button that pops up to continue.</div>`;
  }
  
  if (uploadedFiles.length > 0) {
    ProcessImages.style.display = 'inline-block';
  } else {
    ProcessImages.style.display = 'none'
  }

  ProcessImages.addEventListener('click', () => {
  if (uploadedFiles.length > 0) {
    averageImages(uploadedFiles);
    DownloadOutput.style.display = 'inline-block';
  }
}); 
}

dropzone.addEventListener('click', () => input.click());
input.addEventListener('change', (e) => handleFiles(e.target.files));
dropzone.addEventListener('dragover', (e) => e.preventDefault());
dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  handleFiles(e.dataTransfer.files);
});

handleFiles([]);

const OutputCanvas = document.getElementById('OutputCanvas');
const outputCtx = OutputCanvas.getContext('2d');
const processBtn = document.getElementById('ProcessImages');

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return [h, s, l];
}

function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, (h / 360) + 1/3);
    g = hue2rgb(p, q, h / 360);
    b = hue2rgb(p, q, (h / 360) - 1/3);
  }
  return [r * 255, g * 255, b * 255];
}

function averageImages(files) {
  const targetWidth = 500;
  const targetHeight = 500;

  OutputCanvas.width = targetWidth;
  OutputCanvas.height = targetHeight;

  const numPixels = targetWidth * targetHeight;
  const sinSum = new Float64Array(numPixels);
  const cosSum = new Float64Array(numPixels);
  const satSum = new Float64Array(numPixels);
  const lightSum = new Float64Array(numPixels);

  let loadedCount = 0;

  files.forEach(file => {
    const img = new Image();
    img.onload = () => {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = targetWidth;
      tempCanvas.height = targetHeight;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(img, 0, 0, targetWidth, targetHeight);

      const imageData = tempCtx.getImageData(0, 0, targetWidth, targetHeight).data;

      for (let i = 0; i < numPixels; i++) {
        const r = imageData[i * 4];
        const g = imageData[i * 4 + 1];
        const b = imageData[i * 4 + 2];

        const [h, s, l] = rgbToHsl(r, g, b);
        const rad = h * (Math.PI / 180);

        sinSum[i] += Math.sin(rad);
        cosSum[i] += Math.cos(rad);
        satSum[i] += s;
        lightSum[i] += l;
      }

      loadedCount++;
      if (loadedCount === files.length) {
        drawAverage(sinSum, cosSum, satSum, lightSum, files.length, targetWidth, targetHeight);
      }
    };
    img.src = URL.createObjectURL(file);
  });
}

function drawAverage(sinSum, cosSum, satSum, lightSum, count, width, height) {
  const outputData = outputCtx.createImageData(width, height);
  const numPixels = width * height;

  for (let i = 0; i < numPixels; i++) {
    let meanHueRad = Math.atan2(sinSum[i] / count, cosSum[i] / count);
    let meanHue = meanHueRad * (180 / Math.PI);
    if (meanHue < 0) meanHue += 360;

    const meanSat = satSum[i] / count;
    const meanLight = lightSum[i] / count;

    const [r, g, b] = hslToRgb(meanHue, meanSat, meanLight);

    outputData.data[i * 4]     = r;
    outputData.data[i * 4 + 1] = g;
    outputData.data[i * 4 + 2] = b;
    outputData.data[i * 4 + 3] = 255;
  }

  outputCtx.putImageData(outputData, 0, 0);
}

processBtn.addEventListener('click', () => {
  if (uploadedFiles.length > 0) {
    averageImages(uploadedFiles);
  }
});

DownloadOutput.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = 'averaged-image.png';
  link.href = OutputCanvas.toDataURL('image/png');
  link.click();
});
