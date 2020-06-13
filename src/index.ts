#!/usr/bin/env node

import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import keytar from 'keytar';
import glob from 'glob';
import yargs from 'yargs';

function encryptPassword(password: string, profileName: string): string {
    const result: Buffer[] = [];

    const salt = crypto.randomBytes(16);
    result.push(salt);

    const key = crypto.pbkdf2Sync(profileName, salt, 32767, 16, 'sha1');

    const iv = crypto.randomBytes(12);
    result.push(iv);

    const aes = crypto.createCipheriv('aes-128-gcm', key, iv);
    result.push(aes.update(password));
    result.push(aes.final());
    result.push(aes.getAuthTag());

    return Buffer.concat(result).toString('base64');
}

const credentialService = 'org.openvpn.client.';

function saveCredential(password: string, profileName: string): Promise<void> {
    return keytar.setPassword(
        credentialService,
        profileName,
        encryptPassword(password, profileName)
    );
}

yargs
    .wrap(yargs.terminalWidth())
    .strict()
    .scriptName('openvpn-connect-profile-manager')
    .usage('$0 <command> [options]')
    .option('config', {
        type: 'string',
        describe: 'Path to OpenVPN Connect config file',
        demandOption: false,
        requiresArg: true,
        normalize: true,
        default: path.resolve(os.homedir(), 'AppData', 'Roaming', 'OpenVPN Connect', 'config.json'),
        group: 'Command Options:',
    })
    .alias('c', 'config')
    .demandCommand(1, 'No command given')
    .command('import <username> [glob]', 'Import profiles',
        (yargs) => {
            return yargs
                .positional('username', {
                    type: 'string',
                    describe: 'Username will be saved in imported profile config as plain text',
                    demandOption: 'Username is required',
                })
                .positional('glob', {
                    type: 'string',
                    describe: 'Glob to match OpenVPN Profile files',
                    default: '*.ovpn',
                })
                .option('password', {
                    type: 'string',
                    describe: 'Password will be saved into Windows Credential Manager encrypted',
                    requiresArg: true,
                    group: 'Command Options:',
                }).alias('p', 'password')
        },
        async ({ username, glob: profileGlob, password, config: configPath }) => {
            const filenames = glob.sync(profileGlob as string, { realpath: true });

            // Read out old config
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            const root = JSON.parse(config['persist:root']);
            const status = JSON.parse(root['status']);
            const profiles = status['profiles'];

            const profileFolder = path.resolve(path.dirname(configPath), 'profiles');

            for (const filename of filenames) {
                const content = fs.readFileSync(filename, 'utf-8');
                const [, hostname, port = '1194'] = content.match(/remote\s*([^\s]*)\s*(\d+)?/);
                const basename = path.basename(filename, path.extname(filename));
                const profileDisplayName = `${hostname} ${basename}`;
                const profileName = `PC ${profileDisplayName}`;

                // Add profile to config
                profiles[profileName] = {
                    config: {
                        content,
                    },
                    error: false,
                    filePath: filename,
                    hostname,
                    lastModified: Date.now(),
                    mergedConfig: {
                        basename: filename,
                        errorText: '',
                        profileContent: content,
                        refPathList: [],
                        status: 'MERGE_SUCCESS',
                    },
                    name: profileName,
                    privateKeyPassword: false,
                    profileConfig: {
                        allowPasswordSave: true,
                        autologin: false,
                        challengeQuestion: '',
                        error: false,
                        externalPki: true,
                        friendlyName: '',
                        message: '',
                        privateKeyPasswordRequired: false,
                        profileName: hostname,
                        remoteHost: hostname,
                        remotePort: port ?? '1194',
                        remoteProto: 'udp',
                        serverList: [],
                        staticChallenge: '',
                        staticChallengeEcho: false,
                        userlockedUsername: '',
                    },
                    profileDisplayName,
                    profileName,
                    profileType: 'PC',
                    savedPassword: !!password,
                    selectedServer: {
                        server: null,
                    },
                    username,
                };

                // Copy ovpn file to profile folder
                fs.writeFileSync(path.resolve(profileFolder, `${profileName}.ovpn`), content);

                // Save password into Windows Credential Manager if provided.
                if (password) {
                    await saveCredential(password, profileName);
                }
            }

            // Write back config
            root['status'] = JSON.stringify(status);
            config['persist:root'] = JSON.stringify(root);
            fs.writeFileSync(configPath, JSON.stringify(config));

            console.log(`${filenames.length} profile(s) imported`);
        }
    )
    .command('remove <regex>', 'Remove profiles',
        (yargs) => {
            return yargs
                .positional('regex', {
                    demandOption: 'Regex is required',
                    describe: 'Regex to match profiles to be removed',
                    coerce: (value: string) => {
                        return new RegExp(value);
                    },
                });
        },
        async ({ regex, config: configPath }) => {
            // Read out old config
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            const root = JSON.parse(config['persist:root']);
            const status = JSON.parse(root['status']);
            const profiles = status['profiles'];

            const profileFolder = path.resolve(path.dirname(configPath), 'profiles');
            let count = 0;

            for (const profileName in profiles) {
                if (profileName.match(regex)) {
                    delete profiles[profileName];
                    fs.unlinkSync(path.resolve(profileFolder, `${profileName}.ovpn`));
                    await keytar.deletePassword(credentialService, profileName);
                    count++;
                }
            }

            // Write back config
            root['status'] = JSON.stringify(status);
            config['persist:root'] = JSON.stringify(root);
            fs.writeFileSync(configPath, JSON.stringify(config));

            console.log(`${count} profile(s) removed`);
        }
    )
    .command('set <regex>', 'Update profiles',
        (yargs) => {
            return yargs
                .positional('regex', {
                    demandOption: 'Regex is required',
                    describe: 'Regex to match profiles to be removed',
                    coerce: (value: string) => {
                        return new RegExp(value);
                    },
                })
                .option('username', {
                    type: 'string',
                    describe: 'Username will be saved in imported profile config as plain text',
                    requiresArg: true,
                    group: 'Command Options:',
                }).alias('u', 'username')
                .option('password', {
                    type: 'string',
                    describe: 'Password will be saved into Windows Credential Manager encrypted',
                    requiresArg: true,
                    group: 'Command Options:',
                }).alias('p', 'password');
        }, async ({ regex, username, password, config: configPath }) => {
            if (!username && !password) {
                console.log('nothing to update');
                return;
            }

            // Read out old config
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            const root = JSON.parse(config['persist:root']);
            const status = JSON.parse(root['status']);
            const profiles = status['profiles'];

            const profileFolder = path.resolve(path.dirname(configPath), 'profiles');
            let count = 0;

            for (const profileName in profiles) {
                if (profileName.match(regex)) {
                    if (username) {
                        profiles[profileName].username = username;
                    }

                    if (password) {
                        await keytar.deletePassword(credentialService, profileName);
                    }

                    count++;
                }
            }

            // Write back config
            root['status'] = JSON.stringify(status);
            config['persist:root'] = JSON.stringify(root);
            fs.writeFileSync(configPath, JSON.stringify(config));

            console.log(`${count} profile(s) updated`);
        }
    )
    .alias('v', 'version').group('version', 'Global Options:')
    .alias('h', 'help').group('help', 'Global Options:')
    .help()
    .argv;
