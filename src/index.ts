#!/usr/bin/env node

import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import keytar from 'keytar';
import yargs from 'yargs';
import glob from 'glob';

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

function createProfile(
    filepath: string,
    username: string,
    profileFolder: string,
) {
    const content = fs.readFileSync(filepath, 'utf-8');
    const [, hostname, port] = content.match(/remote\s*([^\s]*)\s*(\d+)?/);
    const basename = path.basename(filepath, path.extname(filepath));
    const profileDisplayName = `${hostname} ${basename}`;
    const profileName = `PC ${profileDisplayName}`;

    fs.writeFileSync(path.resolve(profileFolder, `${profileName}.ovpn`), content);

    return [
        profileName,
        {
            config: {
                content,
            },
            error: false,
            filePath: filepath,
            hostname,
            lastModified: Date.now(),
            mergedConfig: {
                basename: filepath,
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
            savedPassword: true,
            selectedServer: {
                server: null,
            },
            username,
        }
    ] as const;
}

function updateConfig(configPath: string, profiles: any) {
    if (!fs.existsSync(configPath)) {
        console.error(`File "${configPath}" doesn't exist`);
        process.exit();
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const root = JSON.parse(config['persist:root']);
    const status = JSON.parse(root['status']);

    status.profiles = profiles;

    root.status = JSON.stringify(status);
    config['persist:root'] = JSON.stringify(root);

    fs.writeFileSync(configPath, JSON.stringify(config));
}

const { username, password, config, glob: files } = yargs
    .scriptName('Import-OpenVPNConnectProfile')
    .usage(
        '$0 [glob]',
        'Batch import OpenVPN profiles matching glob into OpenVPN Connect',
        (yargs) => {
            return yargs.positional('glob', {
                default: '*.ovpn',
                describe: 'Glob to match OpenVPN Profile files',
                type: 'string',
            });
        }
    )
    .option('username', {
        alias: 'u',
        demandOption: 'Username is required',
        requiresArg: true,
        type: 'string',
        describe: 'Username will be saved in OpenVPN Connect config file as plain text',
    })
    .option('password', {
        alias: 'p',
        demandOption: 'Password is required',
        requiresArg: true,
        describe: 'Password will be encrypted, then saved into Windows Crendential Manager',
        type: 'string',
    })
    .option('config', {
        alias: 'c',
        demandOption: false,
        requiresArg: true,
        normalize: true,
        default: path.resolve(os.homedir(), 'AppData', 'Roaming', 'OpenVPN Connect', 'config.json'),
        describe: 'Path to OpenVPN Connect config file',
        type: 'string',
    })
    .help()
    .argv;

const profileFolder = path.resolve(path.dirname(config), 'profiles');

const filenames = glob.sync(files as string, { realpath: true });
const profiles = Object.fromEntries(
    filenames.map(filename => {
        const filepath = path.resolve(filename);
        return createProfile(filename, username, profileFolder);
    })
);

(async () => {
    for (const { account } of await keytar.findCredentials(credentialService)) {
        await keytar.deletePassword(credentialService, account);
    }

    for (const profileName in profiles) {
        await saveCredential(password, profileName);
    }
})();

updateConfig(config, profiles);

console.log(`${Object.keys(profiles).length} profile(s) imported`);
