/**
 * The rsa file of util module of xxd.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     util
 * @link        https://www.xuanim.com
 */
package util

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"math/big"
	mrd "math/rand"
	"os"
	"time"
)

type CertInformation struct {
	Country            []string
	Organization       []string
	OrganizationalUnit []string
	EmailAddress       []string
	Province           []string
	Locality           []string
	CommonName         string
	CrtName, KeyName   string
	IsCA               bool
	Names              []pkix.AttributeTypeAndValue
}

var crtInfo = CertInformation{
	Country:            []string{"CN"},
	Organization:       []string{"cnezsoft"},
	OrganizationalUnit: []string{"cnezsoft"},
	EmailAddress:       []string{"pengjiangxiu@cnezsoft.com"},
	Province:           []string{"ShanDong"},
	Locality:           []string{"QingDao"},
	CommonName:         "cnezsoft",
	CrtName:            GetProgramName() + ".crt",
	KeyName:            GetProgramName() + ".key",
	IsCA:               true}

// SSL证书处理
func CreateSignedCertKey() (string, string, error) {
	crtPath := Config.CrtPath + GetProgramName() + ".crt"
	keyPath := Config.CrtPath + GetProgramName() + ".key"

	LogDetail(GetLang("[CreateSignedCertKey]", " ", "crtPath", " ") + crtPath)
	LogDetail(GetLang("[CreateSignedCertKey]", " ", "keyPath", " ") + keyPath)

	if Exists(crtPath) && Exists(keyPath) {
		return crtPath, keyPath, nil
	}

	Rm(crtPath)
	Rm(keyPath)

	crt := newCertificate(crtInfo)
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return "", "", err
	}

	var buf []byte
	buf, err = x509.CreateCertificate(rand.Reader, crt, crt, &key.PublicKey, key)
	if err != nil {
		return "", "", err
	}

	err = write(crtInfo.CrtName, "CERTIFICATE", buf)
	if err != nil {
		return "", "", err
	}

	buf = x509.MarshalPKCS1PrivateKey(key)
	return crtPath, keyPath, write(crtInfo.KeyName, "PRIVATE KEY", buf)
}

// 写入
func write(filename, crtType string, p []byte) error {
	filename = Config.CrtPath + filename
	err := Mkdir(Config.CrtPath)
	if err != nil {
		Log("error", GetLang("[CreateSignedCertKey]", " ", "Certificate dir create error", " :%s"), err)
	}

	fileHandle, err := os.Create(filename)
	if err != nil {
		return err
	}
	defer fileHandle.Close()

	var b *pem.Block = &pem.Block{Bytes: p, Type: crtType}
	return pem.Encode(fileHandle, b)
}

// 证书信息
func newCertificate(info CertInformation) *x509.Certificate {
	return &x509.Certificate{
		SerialNumber: big.NewInt(mrd.Int63()),
		Subject: pkix.Name{
			Country:            info.Country,
			Organization:       info.Organization,
			OrganizationalUnit: info.OrganizationalUnit,
			Province:           info.Province,
			CommonName:         info.CommonName,
			Locality:           info.Locality,
			ExtraNames:         info.Names,
		},
		NotBefore:             time.Now(),                                                                 //证书的开始时间
		NotAfter:              time.Now().AddDate(20, 0, 0),                                               //证书的结束时间
		BasicConstraintsValid: true,                                                                       //基本的有效性约束
		IsCA:                  info.IsCA,                                                                  //是否是根证书
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth, x509.ExtKeyUsageServerAuth}, //证书用途
		KeyUsage:              x509.KeyUsageDigitalSignature | x509.KeyUsageCertSign,
		EmailAddresses:        info.EmailAddress,
	}
}
