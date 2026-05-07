package util

import (
	"bytes"
	"image"
	"image/color"
	"image/draw"
	"image/jpeg"
	"os"

	"github.com/disintegration/imaging"
)

func CompressImageResource(saveFile string, thumbSaveFile string) (int, int, error) {
	ff, _ := os.ReadFile(saveFile)

	compressQuality := 80
	maxWidth := float32(2000)
	maxHeight := float32(360)
	standardAspect := maxWidth / maxHeight
	cutAspect := float32(0.5)

	// 可写方式打开文件
	thumb, err := os.OpenFile(
		thumbSaveFile,
		os.O_WRONLY|os.O_TRUNC|os.O_CREATE,
		0666,
	)
	if err != nil {
		LogDetail(GetLang("[fileUpload]", " ", "Open file error", "."))
		return 0, 0, err
	}
	defer thumb.Close()

	imgSrc, _, err := image.Decode(bytes.NewReader(ff))
	if err != nil {
		LogDetail(GetLang("[fileUpload]", " ", "Image decode error", "."))
		return 0, 0, err
	}
	width := float32(imgSrc.Bounds().Max.X)
	height := float32(imgSrc.Bounds().Max.Y)
	aspect := width / height

	thumbWidth := width
	thumbHeight := height
	isCut := false

	// 如果高度超高了
	if thumbHeight > maxHeight {
		// 如果宽高比小于0.5导致缩放后宽度不足180
		if aspect < cutAspect {
			isCut = true
			thumbWidth = maxHeight * cutAspect
			thumbHeight = thumbWidth / aspect
		} else if aspect < standardAspect { // 高度更高，以高为基准缩放宽度
			thumbHeight = maxHeight
			thumbWidth = thumbHeight * aspect
		} else { // 宽度更宽，以宽为基准缩放高度
			thumbWidth = maxWidth
			thumbHeight = thumbWidth / aspect
		}
	}

	// 如果高度调整后，宽度仍然过宽
	if thumbWidth > maxWidth {
		thumbWidth = maxWidth
		thumbHeight = thumbWidth / aspect
	}

	// 如果高度调整后，宽度不足180, 或者原本宽度不足180，不进行缩放
	if thumbWidth < maxHeight*cutAspect || width < maxHeight*cutAspect {
		isCut = false
		thumbWidth = width
		thumbHeight = height
	}

	imgSrc = imaging.Resize(imgSrc, int(thumbWidth), int(thumbHeight), imaging.Lanczos)

	if isCut {
		thumbHeight = maxHeight
		imgSrc = imaging.Fill(imgSrc, int(thumbWidth), int(thumbHeight), imaging.TopLeft, imaging.Lanczos)
	}
	newImg := image.NewRGBA(imgSrc.Bounds())
	draw.Draw(newImg, newImg.Bounds(), &image.Uniform{C: color.White}, image.Point{}, draw.Src)
	draw.Draw(newImg, newImg.Bounds(), imgSrc, imgSrc.Bounds().Min, draw.Over)

	buf := bytes.Buffer{}
	err = jpeg.Encode(&buf, newImg, &jpeg.Options{Quality: compressQuality})
	if err != nil {
		LogDetail(GetLang("[fileUpload]", " ", "Image Encode error", "."))
		return 0, 0, err
	}
	if buf.Len() > len(ff) {
		thumb.Write(ff)
		return int(thumbWidth), int(thumbHeight), nil
	}

	thumb.Write(buf.Bytes())
	return int(thumbWidth), int(thumbHeight), nil
}
