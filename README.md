# OpenVPN Connect Profile Batch Importor

A CLI tool to import multiple OpenVPN profiles into OpenVPN Connect app.

Tested with OpenVPN Connect v3.1.3.(713) on Windows 10.

## Usage

```shell
npm i -g @yume-chan/openvpn-conenct-profile-batch-importer
```

```text
Import-OpenVPNConnectProfile [glob]

Batch import OpenVPN profiles matching glob into OpenVPN Connect

Positionals:
  glob  Glob to match OpenVPN Profile files         [string] [default: "*.ovpn"]

Options:
  --version       Show version number                                  [boolean]
  --username, -u  Username will be saved in OpenVPN Connect config file as plain
                  text                                       [string] [required]
  --password, -p  Password will be encrypted, then saved into Windows
                  Crendential Manager                        [string] [required]
  --config, -c    Path to OpenVPN Connect config file
                      [string] [default: "C:\Users\Simon\AppData\Roaming\OpenVPN
                                                           Connect\config.json"]
  --help          Show help                                            [boolean]
```

**Examples:**

```shell
Import-OpenVPNConnectProfile --username test@example.com --password p@ssw0rd "C:\OpenVPN\*.ovpn"
```

## Development

This project uses [pnpm](https://pnpm.js.org/) ([GitHub](https://github.com/pnpm/pnpm)) to manage dependency packages.

### Install dependencies:

``` shell
pnpm i
```

You may also use `npm`, but the lockfile may become out of sync.

## License

MIT
