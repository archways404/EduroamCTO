const puppeteer = require('puppeteer');
const fs = require('fs');
const plist = require('plist');
const https = require('https');
const { execSync } = require('child_process');
const readline = require('readline');
const path = require('path');
const os = require('os');
const tty = require('tty');

const INPUT_SIGNED = 'Eduroam-MAU.mobileconfig';
const EXTRACTED_XML = 'Eduroam.xml';
const OUTPUT_PROFILE = 'Eduroam-Updated.mobileconfig';
const MOBILECONFIG_URL =
	'https://cat.eduroam.org/user/API.php?action=downloadInstaller&lang=en&profile=2205&device=apple_global&generatedfor=user&openroaming=0';

const platform = os.platform();
const arch = os.arch();

function promptHidden(query) {
	return new Promise((resolve) => {
		const stdin = process.stdin;
		const stdout = process.stdout;
		stdin.resume();
		stdin.setRawMode(true);
		stdin.setEncoding('utf8');

		let password = '';
		stdout.write(query);

		const onData = (char) => {
			char = char.toString();

			if (char === '\n' || char === '\r' || char === '\u0004') {
				stdout.write('\n');
				stdin.setRawMode(false);
				stdin.pause();
				stdin.removeListener('data', onData); // 🛠️ FIXED: Cleanup to prevent ghost input
				resolve(password);
			} else if (char === '\u0003') {
				process.exit(); // Ctrl+C
			} else if (char === '\u007f') {
				// Backspace
				if (password.length > 0) {
					password = password.slice(0, -1);
					stdout.clearLine(0);
					stdout.cursorTo(0);
					stdout.write(query + '*'.repeat(password.length));
				}
			} else {
				password += char;
				stdout.write('*');
			}
		};

		stdin.on('data', onData);
	});
}

function promptCredentials() {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	return new Promise((resolve) => {
		rl.question('Enter your MAU username (e.g. ab1234): ', async (user) => {
			rl.close();
			const trimmed = user.trim();
			if (!/^[a-zA-Z0-9]{5,}$/.test(trimmed)) {
				console.error(
					'❌ Invalid username. It must be at least 5 characters long and contain only letters and/or numbers (no symbols).'
				);
				process.exit(1);
			}

			const pass = await promptHidden('Enter your password: ');
			resolve({ username: `${trimmed}@mau.se`, password: pass });
		});
	});
}

async function getBrowser() {
	return await puppeteer.launch({
		headless: true,
		executablePath: puppeteer.executablePath(),
	});
}

async function getAccountsFromPortal(USERNAME, PASSWORD) {
	const browser = await getBrowser();
	const page = await browser.newPage();

	await page.goto('https://ids.mau.se/', { waitUntil: 'networkidle2' });
	await page.click('a.index-button');
	await page.waitForSelector('#userNameInput');
	await page.type('#userNameInput', USERNAME, { delay: 50 });
	await page.type('#passwordInput', PASSWORD, { delay: 50 });
	await page.click('#submitButton');
	await page.waitForNavigation({ waitUntil: 'networkidle2' });

	await page.click('a.card.card-img-wifi');
	await page.waitForSelector('ul.wifi-list > li');

	await page.evaluate(() => {
		document.querySelectorAll('input[type="password"]').forEach((i) => (i.type = 'text'));
	});

	const accounts = await page.evaluate(() => {
		document.querySelectorAll('input[type="password"]').forEach((i) => (i.type = 'text'));
		return Array.from(document.querySelectorAll('ul.wifi-list > li'))
			.map((li) => {
				const device = li.querySelector('.wifi-list__device > div')?.textContent.trim();
				const inputs = li.querySelectorAll('.wifi-list__details input[type="text"]');
				const username = inputs[0]?.value.trim();
				const password = inputs[1]?.value.trim();
				if (device && username && password) {
					return { device, username, password };
				}
				return null;
			})
			.filter(Boolean);
	});

	await browser.close();
	return accounts;
}

function injectCredentials(obj, username, password) {
	if (typeof obj !== 'object') return;
	if (obj.PayloadType === 'com.apple.wifi.managed' && obj.EAPClientConfiguration) {
		obj.EAPClientConfiguration.UserName = username;
		obj.EAPClientConfiguration.UserPassword = password;
	}
	for (const key in obj) {
		if (typeof obj[key] === 'object') injectCredentials(obj[key], username, password);
	}
}

function downloadMobileconfig() {
	return new Promise((resolve, reject) => {
		console.log('📥 Downloading mobileconfig...');
		https
			.get(MOBILECONFIG_URL, (res) => {
				const data = [];
				res.on('data', (chunk) => data.push(chunk));
				res.on('end', () => {
					fs.writeFileSync(INPUT_SIGNED, Buffer.concat(data));
					console.log('✅ Mobileconfig downloaded.\n');
					resolve();
				});
			})
			.on('error', (err) => {
				reject(new Error(`Failed to download mobileconfig: ${err.message}`));
			});
	});
}

function writeWindowsProfile(username, password) {
	const xml = `<?xml version="1.0"?>
<WLANProfile xmlns="http://www.microsoft.com/networking/WLAN/profile/v1">
	<name>eduroam</name>
	<SSIDConfig>
		<SSID>
			<name>eduroam</name>
		</SSID>
	</SSIDConfig>
	<connectionType>ESS</connectionType>
	<connectionMode>auto</connectionMode>
	<MSM>
		<security>
			<authEncryption>
				<authentication>WPA2</authentication>
				<encryption>AES</encryption>
				<useOneX>true</useOneX>
			</authEncryption>
			<OneX xmlns="http://www.microsoft.com/networking/OneX/v1">
				<EAPConfig>
					<EapHostConfig xmlns="http://www.microsoft.com/provisioning/EapHostConfig">
						<EapMethod>
							<Type>25</Type>
							<VendorId>0</VendorId>
							<VendorType>0</VendorType>
							<AuthorId>0</AuthorId>
						</EapMethod>
						<Config xmlns:eapCommon="http://www.microsoft.com/provisioning/EapCommon" xmlns:baseEap="http://www.microsoft.com/provisioning/BaseEapConnectionPropertiesV1">
							<baseEap:Eap>
								<baseEap:Type>25</baseEap:Type>
								<eapCommon:EapType>
									<eapCommon:Username>${username}</eapCommon:Username>
									<eapCommon:Password>${password}</eapCommon:Password>
								</eapCommon:EapType>
							</baseEap:Eap>
						</Config>
					</EapHostConfig>
				</EAPConfig>
			</OneX>
		</security>
	</MSM>
</WLANProfile>`;

	const profilePath = path.join(__dirname, 'eduroam-profile.xml');
	fs.writeFileSync(profilePath, xml);
	return profilePath;
}

async function run() {
	try {
		if (platform === 'darwin') await downloadMobileconfig();

		const creds = await promptCredentials();
		const accounts = await getAccountsFromPortal(creds.username, creds.password);

		if (!accounts.length) {
			console.error('❌ No accounts found.');
			process.exit(1);
		}

		if (platform === 'darwin') console.clear();
		
		console.log('Available Accounts:\n');
		accounts.forEach((acc, i) => {
			console.log(`  [${i + 1}] ${acc.device}\n      ↳ ${acc.username}  --  ${acc.password}`);
			console.log(' ');
		});

		const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
		rl.question('\nEnter the number of the account to use: ', (choice) => {
			const index = parseInt(choice.trim()) - 1;
			if (index < 0 || index >= accounts.length) {
				console.error('❌ Invalid selection.');
				rl.close();
				return;
			}

			const { username, password } = accounts[index];

			if (platform === 'darwin') {
				console.log('macOS detected.');
				execSync(`security cms -D -i ${INPUT_SIGNED} -o ${EXTRACTED_XML}`);
				execSync(`plutil -lint ${EXTRACTED_XML}`);
				const xmlContent = fs.readFileSync(EXTRACTED_XML, 'utf8');
				const json = plist.parse(xmlContent);
				injectCredentials(json, username, password);
				fs.writeFileSync(EXTRACTED_XML, plist.build(json));
				execSync(`plutil -convert binary1 ${EXTRACTED_XML} -o ${OUTPUT_PROFILE}`);
				execSync(`open "${path.resolve(OUTPUT_PROFILE)}"`);
				execSync(`open "x-apple.systempreferences:com.apple.configurationprofiles"`);
			} else if (platform === 'win32') {
				console.log('🪟 Windows detected.');

				const psScript = path.join(__dirname, 'windows/install_eduroam.ps1');
				const escapedUsername = username.replace(/"/g, '\\"');
				const escapedPassword = password.replace(/"/g, '\\"');

				const cmd = `powershell -ExecutionPolicy Bypass -File "${psScript}" -Username "${escapedUsername}" -Password "${escapedPassword}"`;

				try {
					execSync(cmd, { stdio: 'inherit' });
					console.log('✅ PowerShell script executed successfully.');
				} catch (e) {
					console.error(`❌ PowerShell script failed: ${e.message}`);
				}

				/*
				const profilePath = writeWindowsProfile(username, password);


				execSync(`netsh wlan add profile filename="${profilePath}"`);
				try {
					execSync(`rasdial eduroam "${username}" "${password}"`);
					console.log('✅ Connected using rasdial.');
				} catch (e) {
					console.error(
						'❌ Failed to connect with rasdial. Make sure the profile was added and Wi-Fi is on.'
					);
				}
				
				*/
			} else {
				console.error(`❌ Unsupported platform: ${platform}`);
				process.exit(1);
			}
			rl.close();
			// Cleanup temporary files
			const cleanupFiles = [INPUT_SIGNED, EXTRACTED_XML, OUTPUT_PROFILE, 'eduroam-profile.xml'];
			cleanupFiles.forEach((file) => {
				const fullPath = path.resolve(__dirname, file);
				if (fs.existsSync(fullPath)) {
					try {
						fs.unlinkSync(fullPath);
					} catch (e) {
						console.warn(`⚠️ Could not delete ${file}: ${e.message}`);
					}
				}
			});
		});
	} catch (err) {
		console.error(`❌ Error: ${err.message}`);
		process.exit(1);
	}
}

run();
