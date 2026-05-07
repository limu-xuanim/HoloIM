/**
 * The aes file of api current module of xxd.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     api
 * @link        https://www.xuanim.com
 */
package api

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"xxd/util"
)

// ase加密
func AesEncrypt(origData, key []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	blockSize := block.BlockSize()
	util.LogDetail(util.GetLang("[AESEncrypt]", " ", "origData", ":") + " " + string(origData))
	origData = pkcs5Padding(origData, blockSize)
	blockMode := cipher.NewCBCEncrypter(block, key[:blockSize])
	crypted := make([]byte, len(origData))
	// 根据CryptBlocks方法的说明，如下方式初始化crypted也可以
	// crypted := origData
	blockMode.CryptBlocks(crypted, origData)
	return crypted, nil
}

// ase解密
func AesDecrypt(crypted, key []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	blockSize := block.BlockSize()
	cryptedSize := len(crypted)
	if cryptedSize == 0 || cryptedSize%blockSize != 0 {
		readableMessage := util.Asciify(string(crypted))
		errorMessage := util.Pretty(readableMessage)
		util.Log("error", "%s %s%s", util.GetLang("[AesDecrypt] decrypt failed, data:"), errorMessage, "\n")
		decryptError := util.Errorf("%s", util.GetLang("AES decrypt error, Blocks entered are incomplete"))
		if util.StringContains(errorMessage, "license error") {
			decryptError = util.Errorf("%s", util.GetLang("Backend license error"))
		}
		return []byte(readableMessage), decryptError
	}

	blockMode := cipher.NewCBCDecrypter(block, key[:blockSize])
	origData := make([]byte, cryptedSize)
	// origData := crypted
	blockMode.CryptBlocks(origData, crypted)
	origData = pkcs5UnPadding(origData)
	if origData == nil {
		return nil, util.Errorf("%s", "Pkcs5UnPadding error")
	}

	return origData, nil
}

func pkcs5Padding(ciphertext []byte, blockSize int) []byte {
	padding := blockSize - len(ciphertext)%blockSize
	padtext := bytes.Repeat([]byte{byte(padding)}, padding)
	return append(ciphertext, padtext...)
}

func pkcs5UnPadding(origData []byte) []byte {
	length := len(origData)
	// 去掉最后一个字节 unpadding 次
	unpadding := int(origData[length-1])
	if unpadding > length {
		util.Log("error", "AES unpadding len > data length")
		return nil
	}

	return origData[:(length - unpadding)]
}
