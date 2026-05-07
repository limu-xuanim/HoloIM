module xxd

go 1.25.0

// build in windows need to replace github.com/dunglas/frankenphp
// replace github.com/dunglas/frankenphp => PATH_TO_FRANKENPHP

require (
	github.com/Unknwon/goconfig v0.0.0-20200817131228-2444c9802e76
	github.com/davecgh/go-spew v1.1.2-0.20180830191138-d8f796af33cc
	github.com/disintegration/imaging v1.6.2
	github.com/dunglas/frankenphp v1.3.0
	github.com/francoispqt/gojay v1.2.13
	github.com/go-ldap/ldap/v3 v3.4.10
	github.com/go-oauth2/oauth2/v4 v4.5.2
	github.com/go-sql-driver/mysql v1.8.1
	github.com/goccy/go-json v0.10.2
	github.com/gorilla/sessions v1.2.2
	github.com/gorilla/websocket v1.5.0
	github.com/kardianos/service v1.1.0
	github.com/mattn/go-sqlite3 v1.14.15
	github.com/maypok86/otter v1.2.4
	github.com/minio/sio v0.2.1
	github.com/mitchellh/mapstructure v1.3.3
	github.com/mozillazg/go-pinyin v0.20.0
	github.com/pion/stun v0.3.5
	github.com/pion/turn/v2 v2.0.5
	github.com/robfig/cron/v3 v3.0.1
	github.com/segmentio/encoding v0.3.4
	github.com/sethgrid/pester v1.1.0
	github.com/wI2L/jettison v0.7.4
	go.uber.org/zap v1.27.0
	golang.org/x/crypto v0.41.0
	golang.org/x/exp v0.0.0-20240222234643-814bf88cf225
	golang.org/x/term v0.34.0
	gorm.io/driver/mysql v1.5.7
	gorm.io/gorm v1.30.0
)

exclude golang.org/x/crypto v0.31.0

require (
	filippo.io/edwards25519 v1.1.0 // indirect
	github.com/Azure/go-ntlmssp v0.0.0-20221128193559-754e69321358 // indirect
	github.com/aymerick/douceur v0.2.0 // indirect
	github.com/beorn7/perks v1.0.1 // indirect
	github.com/bytedance/sonic v1.9.1 // indirect
	github.com/cespare/xxhash/v2 v2.3.0 // indirect
	github.com/chenzhuoyu/base64x v0.0.0-20221115062448-fe3a3abad311 // indirect
	github.com/dolthub/maphash v0.1.0 // indirect
	github.com/gabriel-vasile/mimetype v1.4.2 // indirect
	github.com/gammazero/deque v1.1.0 // indirect
	github.com/gin-contrib/sse v0.1.0 // indirect
	github.com/go-asn1-ber/asn1-ber v1.5.7 // indirect
	github.com/go-playground/locales v0.14.1 // indirect
	github.com/go-playground/universal-translator v0.18.1 // indirect
	github.com/go-playground/validator/v10 v10.14.0 // indirect
	github.com/google/go-cmp v0.7.0 // indirect
	github.com/gorilla/css v1.0.1 // indirect
	github.com/jinzhu/inflection v1.0.0 // indirect
	github.com/jinzhu/now v1.1.5 // indirect
	github.com/json-iterator/go v1.1.12 // indirect
	github.com/klauspost/compress v1.18.0 // indirect
	github.com/klauspost/cpuid/v2 v2.2.4 // indirect
	github.com/leodido/go-urn v1.2.4 // indirect
	github.com/mattn/go-isatty v0.0.19 // indirect
	github.com/modern-go/concurrent v0.0.0-20180306012644-bacd9c7ef1dd // indirect
	github.com/modern-go/reflect2 v1.0.2 // indirect
	github.com/munnerz/goautoneg v0.0.0-20191010083416-a7dc8b61c822 // indirect
	github.com/pelletier/go-toml/v2 v2.0.8 // indirect
	github.com/prometheus/client_golang v1.20.5 // indirect
	github.com/prometheus/client_model v0.6.1 // indirect
	github.com/prometheus/common v0.60.1 // indirect
	github.com/prometheus/procfs v0.15.1 // indirect
	github.com/segmentio/asm v1.1.3 // indirect
	github.com/stretchr/testify v1.10.0 // indirect
	github.com/twitchyliquid64/golang-asm v0.15.1 // indirect
	github.com/ugorji/go/codec v1.2.11 // indirect
	go.uber.org/multierr v1.11.0 // indirect
	golang.org/x/arch v0.3.0 // indirect
	golang.org/x/net v0.43.0 // indirect
	golang.org/x/text v0.28.0 // indirect
	google.golang.org/protobuf v1.36.8 // indirect
	gopkg.in/yaml.v3 v3.0.1 // indirect
)

require (
	github.com/gin-gonic/gin v1.9.1
	github.com/golang-jwt/jwt v3.2.1+incompatible // indirect
	github.com/google/uuid v1.6.0
	github.com/gorilla/securecookie v1.1.2 // indirect
	github.com/maragudk/gomponents v0.20.2
	github.com/microcosm-cc/bluemonday v1.0.27
	github.com/pion/logging v0.2.2 // indirect
	github.com/pion/randutil v0.1.0 // indirect
	github.com/pion/transport v0.10.1 // indirect
	github.com/tidwall/btree v0.0.0-20191029221954-400434d76274 // indirect
	github.com/tidwall/buntdb v1.1.2 // indirect
	github.com/tidwall/gjson v1.12.1 // indirect
	github.com/tidwall/grect v0.0.0-20161006141115-ba9a043346eb // indirect
	github.com/tidwall/match v1.1.1 // indirect
	github.com/tidwall/pretty v1.2.0 // indirect
	github.com/tidwall/rtree v0.0.0-20180113144539-6cd427091e0e // indirect
	github.com/tidwall/tinyqueue v0.0.0-20180302190814-1e39f5511563 // indirect
	golang.org/x/image v0.25.0 // indirect
	golang.org/x/sys v0.35.0 // indirect
)
