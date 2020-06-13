# OpenVPN Connect Profile Batch Importor

A CLI tool to import multiple OpenVPN profiles into OpenVPN Connect app.

Tested with OpenVPN Connect v3.1.3.(713) on Windows 10.

## Usage

```shell
npm i -g @yume-chan/openvpn-connect-profile-batch-importer
```

```text
openvpn-connect-profile-manager <command> [options]

Commands:
  openvpn-connect-profile-manager import    Import profiles
  <username> [glob]
  openvpn-connect-profile-manager remove    Remove profiles
  <regex>
  openvpn-connect-profile-manager set       Update profiles
  <regex>

Command Options:
  -c, --config  Path to OpenVPN Connect config file                     [string]
Global Options:
  -h, --help     Show help                                             [boolean]
  -v, --version  Show version number                                   [boolean]
```

### Import

```text
openvpn-connect-profile-manager import <username> [glob]

Import profiles

Positionals:
  username  Username will be saved in imported profile config as plain text
                                                             [string] [required]
  glob      Glob to match OpenVPN Profile files     [string] [default: "*.ovpn"]

Command Options:
  -c, --config    Path to OpenVPN Connect config file                   [string]
  -p, --password  Password will be saved into Windows Credential Manager
                  encrypted                                             [string]

Global Options:
  -v, --version  Show version number                                   [boolean]
  -h, --help     Show help                                             [boolean]
```

**Example**

```shell
openvpn-connect-profile-manager import test@example.com "C:\OpenVPN\*.ovpn" --password p@ssw0rd
```

### remove

```text
openvpn-connect-profile-manager remove <regex>

Remove profiles

Positionals:
  regex  Regex to match profiles to be removed                        [required]

Command Options:
  -c, --config  Path to OpenVPN Connect config file                     [string]

Global Options:
  -v, --version  Show version number                                   [boolean]
  -h, --help     Show help                                             [boolean]
```

### update

```text
openvpn-connect-profile-manager <command> [options]

Commands:
  openvpn-connect-profile-manager import    Import profiles
  <username> [glob]
  openvpn-connect-profile-manager remove    Remove profiles
  <regex>
  openvpn-connect-profile-manager set       Update profiles
  <regex>

Command Options:
  -c, --config  Path to OpenVPN Connect config file                     [string]

Global Options:
  -v, --version  Show version number                                   [boolean]
  -h, --help     Show help                                             [boolean]
```

## Development

This project uses [pnpm](https://pnpm.js.org/) to manage dependencies.

### Install dependencies:

``` shell
pnpm i
```

## License

MIT
