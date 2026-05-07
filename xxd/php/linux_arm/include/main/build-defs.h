/*
   +----------------------------------------------------------------------+
   | Copyright (c) The PHP Group                                          |
   +----------------------------------------------------------------------+
   | This source file is subject to version 3.01 of the PHP license,      |
   | that is bundled with this package in the file LICENSE, and is        |
   | available through the world-wide-web at the following url:           |
   | https://www.php.net/license/3_01.txt                                 |
   | If you did not receive a copy of the PHP license and are unable to   |
   | obtain it through the world-wide-web, please send a note to          |
   | license@php.net so we can mail you a copy immediately.               |
   +----------------------------------------------------------------------+
   | Author: Stig Sæther Bakken <ssb@php.net>                             |
   +----------------------------------------------------------------------+
*/

#define CONFIGURE_COMMAND " './configure'  '--enable-embed' '--enable-zts' '--disable-zend-signals' '--enable-zend-max-execution-timers' '--prefix=/usr/local/php8.4' '--with-config-file-path=/usr/local/php8.4/etc' '--enable-mbstring' '--with-curl' '--with-openssl' '--with-sqlite3' '--enable-intl' '--enable-calendar' '--enable-ctype' '--enable-dom' '--enable-exif' '--enable-ffi' '--enable-fileinfo' '--enable-filter' '--enable-ftp' '--enable-gettext' '--with-hash' '--with-iconv' '--enable-json' '--with-libxml' '--with-mysqli=mysqlnd' '--enable-mysqlnd' '--enable-pcntl' '--with-pcre-regex' '--enable-pdo' '--with-pdo-mysql=mysqlnd' '--enable-phar' '--enable-posix' '--with-readline' '--enable-reflection' '--enable-session' '--enable-shmop' '--enable-simplexml' '--enable-sockets' '--with-sodium' '--enable-spl' '--enable-standard' '--enable-sysvmsg' '--enable-sysvsem' '--enable-sysvshm' '--enable-tokenizer' '--enable-xml' '--enable-xmlreader' '--enable-xmlwriter' '--with-xsl' '--enable-opcache' '--with-zlib' '--with-ldap' '--with-zip' '--enable-gd' '--with-jpeg'"
#define PHP_ODBC_CFLAGS	""
#define PHP_ODBC_LFLAGS		""
#define PHP_ODBC_LIBS		""
#define PHP_ODBC_TYPE		""
#define PHP_PROG_SENDMAIL	"/usr/sbin/sendmail"
#define PEAR_INSTALLDIR         ""
#define PHP_INCLUDE_PATH	".:"
#define PHP_EXTENSION_DIR       "/usr/local/php8.4/lib/php/extensions/no-debug-zts-20240924"
#define PHP_PREFIX              "/usr/local/php8.4"
#define PHP_BINDIR              "/usr/local/php8.4/bin"
#define PHP_SBINDIR             "/usr/local/php8.4/sbin"
#define PHP_MANDIR              "/usr/local/php8.4/php/man"
#define PHP_LIBDIR              "/usr/local/php8.4/lib/php"
#define PHP_DATADIR             "/usr/local/php8.4/share/php"
#define PHP_SYSCONFDIR          "/usr/local/php8.4/etc"
#define PHP_LOCALSTATEDIR       "/usr/local/php8.4/var"
#define PHP_CONFIG_FILE_PATH    "/usr/local/php8.4/etc"
#define PHP_CONFIG_FILE_SCAN_DIR    ""
#define PHP_SHLIB_SUFFIX        "so"
#define PHP_SHLIB_EXT_PREFIX    ""
