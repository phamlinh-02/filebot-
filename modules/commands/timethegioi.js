const moment = require("moment-timezone");

module.exports.config = {
	name: "timethegioi",
	version: "1.4.0",
	hasPermssion: 0,
	credits: "Hoài Bảo - modified by Grok",
	description: "Hiển thị giờ của 193 nước trên thế giới theo khu vực hoặc theo tên quốc gia, thu hồi tin nhắn chọn khu vực sau khi trả lời",
	commandCategory: "Tiện ích",
	cooldowns: 5,
};

module.exports.handleReply = async function ({ api, event, handleReply }) {
	const { regions, threadID, messageID, originalMessageID } = handleReply;
	const choice = parseInt(event.body);

	if (isNaN(choice) || choice < 1 || choice > regions.length) {
		return api.sendMessage("Vui lòng chọn số hợp lệ từ danh sách khu vực!", threadID, messageID);
	}

	// Thu hồi tin nhắn danh sách khu vực
	api.unsendMessage(originalMessageID);

	const selectedRegion = regions[choice - 1];
	let msg = `🌐 Giờ hiện tại ở ${selectedRegion.name}:\n\n`;

	for (const country of selectedRegion.countries) {
		const now = moment().tz(country.zone).format("HH:mm:ss - DD/MM/YYYY");
		msg += `${country.name}: ${now}\n`;
	}

	return api.sendMessage(msg, threadID, messageID);
};

module.exports.run = async function ({ api, event }) {
	const { threadID, messageID, body } = event;
	const args = body.split(/\s+/).slice(1); // Lấy các từ sau lệnh (bỏ lệnh "timethegioi")

	const regions = [
		{
			name: "Đông Nam Á",
			countries: [
				{ name: "🇧🇳 Brunei", zone: "Asia/Brunei" },
				{ name: "🇰🇭 Campuchia", zone: "Asia/Phnom_Penh" },
				{ name: "🇹🇱 Đông Timor", zone: "Asia/Dili" },
				{ name: "🇮🇩 Indonesia", zone: "Asia/Jakarta" },
				{ name: "🇱🇦 Lào", zone: "Asia/Vientiane" },
				{ name: "🇲🇾 Malaysia", zone: "Asia/Kuala_Lumpur" },
				{ name: "🇲🇲 Myanmar", zone: "Asia/Yangon" },
				{ name: "🇵🇭 Philippines", zone: "Asia/Manila" },
				{ name: "🇸🇬 Singapore", zone: "Asia/Singapore" },
				{ name: "🇹🇭 Thái Lan", zone: "Asia/Bangkok" },
				{ name: "🇻🇳 Việt Nam", zone: "Asia/Ho_Chi_Minh" },
			],
		},
		{
			name: "Châu Á",
			countries: [
				{ name: "🇦🇫 Afghanistan", zone: "Asia/Kabul" },
				{ name: "🇦🇲 Armenia", zone: "Asia/Yerevan" },
				{ name: "🇦🇿 Azerbaijan", zone: "Asia/Baku" },
				{ name: "🇧🇭 Bahrain", zone: "Asia/Bahrain" },
				{ name: "🇧🇩 Bangladesh", zone: "Asia/Dhaka" },
				{ name: "🇧🇹 Bhutan", zone: "Asia/Thimphu" },
				{ name: "🇨🇳 Trung Quốc", zone: "Asia/Shanghai" },
				{ name: "🇨🇾 Síp", zone: "Asia/Nicosia" },
				{ name: "🇬🇪 Georgia", zone: "Asia/Tbilisi" },
				{ name: "🇭🇰 Hồng Kông", zone: "Asia/Hong_Kong" },
				{ name: "🇮🇳 Ấn Độ", zone: "Asia/Kolkata" },
				{ name: "🇮🇷 Iran", zone: "Asia/Tehran" },
				{ name: "🇮🇶 Iraq", zone: "Asia/Baghdad" },
				{ name: "🇮🇱 Israel", zone: "Asia/Jerusalem" },
				{ name: "🇯🇵 Nhật Bản", zone: "Asia/Tokyo" },
				{ name: "🇯🇴 Jordan", zone: "Asia/Amman" },
				{ name: "🇰🇿 Kazakhstan", zone: "Asia/Almaty" },
				{ name: "🇰🇼 Kuwait", zone: "Asia/Kuwait" },
				{ name: "🇰🇬 Kyrgyzstan", zone: "Asia/Bishkek" },
				{ name: "🇱🇧 Lebanon", zone: "Asia/Beirut" },
				{ name: "🇲🇴 Macau", zone: "Asia/Macau" },
				{ name: "🇲🇳 Mông Cổ", zone: "Asia/Ulaanbaatar" },
				{ name: "🇳🇵 Nepal", zone: "Asia/Kathmandu" },
				{ name: "🇰🇵 Bắc Triều Tiên", zone: "Asia/Pyongyang" },
				{ name: "🇴🇲 Oman", zone: "Asia/Muscat" },
				{ name: "🇵🇰 Pakistan", zone: "Asia/Karachi" },
				{ name: "🇶🇦 Qatar", zone: "Asia/Qatar" },
				{ name: "🇸🇦 Ả Rập Saudi", zone: "Asia/Riyadh" },
				{ name: "🇰🇷 Hàn Quốc", zone: "Asia/Seoul" },
				{ name: "🇱🇰 Sri Lanka", zone: "Asia/Colombo" },
				{ name: "🇸🇾 Syria", zone: "Asia/Damascus" },
				{ name: "🇹🇼 Đài Loan", zone: "Asia/Taipei" },
				{ name: "🇹🇯 Tajikistan", zone: "Asia/Dushanbe" },
				{ name: "🇹🇲 Turkmenistan", zone: "Asia/Ashgabat" },
				{ name: "🇦🇪 UAE", zone: "Asia/Dubai" },
				{ name: "🇺🇿 Uzbekistan", zone: "Asia/Tashkent" },
				{ name: "🇾🇪 Yemen", zone: "Asia/Aden" },
			],
		},
		{
			name: "Châu Âu",
			countries: [
				{ name: "🇦🇱 Albania", zone: "Europe/Tirane" },
				{ name: "🇦🇩 Andorra", zone: "Europe/Andorra" },
				{ name: "🇦🇹 Áo", zone: "Europe/Vienna" },
				{ name: "🇧🇾 Belarus", zone: "Europe/Minsk" },
				{ name: "🇧🇪 Bỉ", zone: "Europe/Brussels" },
				{ name: "🇧🇦 Bosnia và Herzegovina", zone: "Europe/Sarajevo" },
				{ name: "🇧🇬 Bulgaria", zone: "Europe/Sofia" },
				{ name: "🇭🇷 Croatia", zone: "Europe/Zagreb" },
				{ name: "🇨🇿 Cộng hòa Séc", zone: "Europe/Prague" },
				{ name: "🇩🇰 Đan Mạch", zone: "Europe/Copenhagen" },
				{ name: "🇪🇪 Estonia", zone: "Europe/Tallinn" },
				{ name: "🇫🇮 Phần Lan", zone: "Europe/Helsinki" },
				{ name: "🇫🇷 Pháp", zone: "Europe/Paris" },
				{ name: "🇩🇪 Đức", zone: "Europe/Berlin" },
				{ name: "🇬🇷 Hy Lạp", zone: "Europe/Athens" },
				{ name: "🇭🇺 Hungary", zone: "Europe/Budapest" },
				{ name: "🇮🇸 Iceland", zone: "Atlantic/Reykjavik" },
				{ name: "🇮🇪 Ireland", zone: "Europe/Dublin" },
				{ name: "🇮🇹 Ý", zone: "Europe/Rome" },
				{ name: "🇱🇻 Latvia", zone: "Europe/Riga" },
				{ name: "🇱🇮 Liechtenstein", zone: "Europe/Vaduz" },
				{ name: "🇱🇹 Lithuania", zone: "Europe/Vilnius" },
				{ name: "🇱🇺 Luxembourg", zone: "Europe/Luxembourg" },
				{ name: "🇲🇹 Malta", zone: "Europe/Malta" },
				{ name: "🇲🇩 Moldova", zone: "Europe/Chisinau" },
				{ name: "🇲🇨 Monaco", zone: "Europe/Monaco" },
				{ name: "🇲🇪 Montenegro", zone: "Europe/Podgorica" },
				{ name: "🇳🇱 Hà Lan", zone: "Europe/Amsterdam" },
				{ name: "🇲🇰 Bắc Macedonia", zone: "Europe/Skopje" },
				{ name: "🇳🇴 Na Uy", zone: "Europe/Oslo" },
				{ name: "🇵🇱 Ba Lan", zone: "Europe/Warsaw" },
				{ name: "🇵🇹 Bồ Đào Nha", zone: "Europe/Lisbon" },
				{ name: "🇷🇴 Romania", zone: "Europe/Bucharest" },
				{ name: "🇷🇺 Nga", zone: "Europe/Moscow" },
				{ name: "🇸🇲 San Marino", zone: "Europe/San_Marino" },
				{ name: "🇷🇸 Serbia", zone: "Europe/Belgrade" },
				{ name: "🇸🇰 Slovakia", zone: "Europe/Bratislava" },
				{ name: "🇸🇮 Slovenia", zone: "Europe/Ljubljana" },
				{ name: "🇪🇸 Tây Ban Nha", zone: "Europe/Madrid" },
				{ name: "🇸🇪 Thụy Điển", zone: "Europe/Stockholm" },
				{ name: "🇨🇭 Thụy Sĩ", zone: "Europe/Zurich" },
				{ name: "🇺🇦 Ukraine", zone: "Europe/Kyiv" },
				{ name: "🇬🇧 Anh", zone: "Europe/London" },
			],
		},
		{
			name: "Châu Mỹ",
			countries: [
				{ name: "🇦🇬 Antigua và Barbuda", zone: "America/Antigua" },
				{ name: "🇦🇷 Argentina", zone: "America/Argentina/Buenos_Aires" },
				{ name: "🇧🇸 Bahamas", zone: "America/Nassau" },
				{ name: "🇧🇧 Barbados", zone: "America/Barbados" },
				{ name: "🇧🇿 Belize", zone: "America/Belize" },
				{ name: "🇧🇴 Bolivia", zone: "America/La_Paz" },
				{ name: "🇧🇷 Brazil", zone: "America/Sao_Paulo" },
				{ name: "🇨🇦 Canada", zone: "America/Toronto" },
				{ name: "🇨🇱 Chile", zone: "America/Santiago" },
				{ name: "🇨🇴 Colombia", zone: "America/Bogota" },
				{ name: "🇨🇷 Costa Rica", zone: "America/Costa_Rica" },
				{ name: "🇨🇺 Cuba", zone: "America/Havana" },
				{ name: "🇩🇲 Dominica", zone: "America/Dominica" },
				{ name: "🇩🇴 Cộng hòa Dominica", zone: "America/Santo_Domingo" },
				{ name: "🇪🇨 Ecuador", zone: "America/Guayaquil" },
				{ name: "🇸🇻 El Salvador", zone: "America/El_Salvador" },
				{ name: "🇬🇩 Grenada", zone: "America/Grenada" },
				{ name: "🇬🇹 Guatemala", zone: "America/Guatemala" },
				{ name: "🇬🇾 Guyana", zone: "America/Guyana" },
				{ name: "🇭🇹 Haiti", zone: "America/Port-au-Prince" },
				{ name: "🇭🇳 Honduras", zone: "America/Tegucigalpa" },
				{ name: "🇯🇲 Jamaica", zone: "America/Jamaica" },
				{ name: "🇲🇽 Mexico", zone: "America/Mexico_City" },
				{ name: "🇳🇮 Nicaragua", zone: "America/Managua" },
				{ name: "🇵🇦 Panama", zone: "America/Panama" },
				{ name: "🇵🇾 Paraguay", zone: "America/Asuncion" },
				{ name: "🇵🇪 Peru", zone: "America/Lima" },
				{ name: "🇰🇳 Saint Kitts và Nevis", zone: "America/St_Kitts" },
				{ name: "🇱🇨 Saint Lucia", zone: "America/St_Lucia" },
				{ name: "🇻🇨 Saint Vincent và Grenadines", zone: "America/St_Vincent" },
				{ name: "🇸🇷 Suriname", zone: "America/Paramaribo" },
				{ name: "🇹🇹 Trinidad và Tobago", zone: "America/Port_of_Spain" },
				{ name: "🇺🇸 Mỹ (New York)", zone: "America/New_York" },
				{ name: "🇺🇸 Mỹ (Los Angeles)", zone: "America/Los_Angeles" },
				{ name: "🇺🇾 Uruguay", zone: "America/Montevideo" },
				{ name: "🇻🇪 Venezuela", zone: "America/Caracas" },
			],
		},
		{
			name: "Châu Đại Dương",
			countries: [
				{ name: "🇦🇺 Úc (Sydney)", zone: "Australia/Sydney" },
				{ name: "🇫🇯 Fiji", zone: "Pacific/Fiji" },
				{ name: "🇰🇮 Kiribati", zone: "Pacific/Tarawa" },
				{ name: "🇲🇭 Quần đảo Marshall", zone: "Pacific/Majuro" },
				{ name: "🇫🇲 Micronesia", zone: "Pacific/Chuuk" },
				{ name: "🇳🇷 Nauru", zone: "Pacific/Nauru" },
				{ name: "🇳🇿 New Zealand", zone: "Pacific/Auckland" },
				{ name: "🇵🇼 Palau", zone: "Pacific/Palau" },
				{ name: "🇵🇬 Papua New Guinea", zone: "Pacific/Port_Moresby" },
				{ name: "🇼🇸 Samoa", zone: "Pacific/Apia" },
				{ name: "🇸🇧 Quần đảo Solomon", zone: "Pacific/Guadalcanal" },
				{ name: "🇹🇴 Tonga", zone: "Pacific/Tongatapu" },
				{ name: "🇹🇻 Tuvalu", zone: "Pacific/Funafuti" },
				{ name: "🇻🇺 Vanuatu", zone: "Pacific/Efate" },
			],
		},
		{
			name: "Châu Phi",
			countries: [
				{ name: "🇩🇿 Algeria", zone: "Africa/Algiers" },
				{ name: "🇦🇴 Angola", zone: "Africa/Luanda" },
				{ name: "🇧🇯 Benin", zone: "Africa/Porto-Novo" },
				{ name: "🇧🇼 Botswana", zone: "Africa/Gaborone" },
				{ name: "🇧🇫 Burkina Faso", zone: "Africa/Ouagadougou" },
				{ name: "🇧🇮 Burundi", zone: "Africa/Gitega" },
				{ name: "🇨🇲 Cameroon", zone: "Africa/Douala" },
				{ name: "🇨🇻 Cape Verde", zone: "Atlantic/Cape_Verde" },
				{ name: "🇨🇫 Cộng hòa Trung Phi", zone: "Africa/Bangui" },
				{ name: "🇹🇩 Chad", zone: "Africa/Ndjamena" },
				{ name: "🇰🇲 Comoros", zone: "Indian/Comoro" },
				{ name: "🇨🇬 Congo", zone: "Africa/Brazzaville" },
				{ name: "🇨🇩 Cộng hòa Dân chủ Congo", zone: "Africa/Kinshasa" },
				{ name: "🇩🇯 Djibouti", zone: "Africa/Djibouti" },
				{ name: "🇪🇬 Ai Cập", zone: "Africa/Cairo" },
				{ name: "🇬🇶 Equatorial Guinea", zone: "Africa/Malabo" },
				{ name: "🇪🇷 Eritrea", zone: "Africa/Asmara" },
				{ name: "🇸🇿 Eswatini", zone: "Africa/Mbabane" },
				{ name: "🇪🇹 Ethiopia", zone: "Africa/Addis_Ababa" },
				{ name: "🇬🇦 Gabon", zone: "Africa/Libreville" },
				{ name: "🇬🇲 Gambia", zone: "Africa/Banjul" },
				{ name: "🇬🇭 Ghana", zone: "Africa/Accra" },
				{ name: "🇬🇳 Guinea", zone: "Africa/Conakry" },
				{ name: "🇬🇼 Guinea-Bissau", zone: "Africa/Bissau" },
				{ name: "🇨🇮 Bờ Biển Ngà", zone: "Africa/Abidjan" },
				{ name: "🇰🇪 Kenya", zone: "Africa/Nairobi" },
				{ name: "🇱🇸 Lesotho", zone: "Africa/Maseru" },
				{ name: "🇱🇷 Liberia", zone: "Africa/Monrovia" },
				{ name: "🇱🇾 Libya", zone: "Africa/Tripoli" },
				{ name: "🇲🇬 Madagascar", zone: "Indian/Antananarivo" },
				{ name: "🇲🇼 Malawi", zone: "Africa/Blantyre" },
				{ name: "🇲🇱 Mali", zone: "Africa/Bamako" },
				{ name: "🇲🇷 Mauritania", zone: "Africa/Nouakchott" },
				{ name: "🇲🇺 Mauritius", zone: "Indian/Mauritius" },
				{ name: "🇲🇦 Morocco", zone: "Africa/Casablanca" },
				{ name: "🇲🇿 Mozambique", zone: "Africa/Maputo" },
				{ name: "🇳🇦 Namibia", zone: "Africa/Windhoek" },
				{ name: "🇳🇪 Niger", zone: "Africa/Niamey" },
				{ name: "🇳🇬 Nigeria", zone: "Africa/Lagos" },
				{ name: "🇷🇼 Rwanda", zone: "Africa/Kigali" },
				{ name: "🇸🇹 São Tomé và Príncipe", zone: "Africa/Sao_Tome" },
				{ name: "🇸🇳 Senegal", zone: "Africa/Dakar" },
				{ name: "🇸🇨 Seychelles", zone: "Indian/Mahe" },
				{ name: "🇸🇱 Sierra Leone", zone: "Africa/Freetown" },
				{ name: "🇸🇴 Somalia", zone: "Africa/Mogadishu" },
				{ name: "🇿🇦 Nam Phi", zone: "Africa/Johannesburg" },
				{ name: "🇸🇸 Nam Sudan", zone: "Africa/Juba" },
				{ name: "🇸🇩 Sudan", zone: "Africa/Khartoum" },
				{ name: "🇹🇬 Togo", zone: "Africa/Lome" },
				{ name: "🇹🇳 Tunisia", zone: "Africa/Tunis" },
				{ name: "🇺🇬 Uganda", zone: "Africa/Kampala" },
				{ name: "🇿🇲 Zambia", zone: "Africa/Lusaka" },
				{ name: "🇿🇼 Zimbabwe", zone: "Africa/Harare" },
			],
		},
		{
			name: "Quan sát viên Liên Hợp Quốc",
			countries: [
				{ name: "🇵🇸 Palestine", zone: "Asia/Gaza" },
				{ name: "🇻🇦 Vatican", zone: "Europe/Vatican" },
			],
		},
	];

	// Nếu có tham số quốc gia
	if (args.length > 0) {
		const countryInput = args.join(" ").toLowerCase().trim();
		let foundCountry = null;
		let foundRegion = null;

		// Tìm quốc gia trong danh sách
		for (const region of regions) {
			const country = region.countries.find(c => 
				c.name.toLowerCase().replace(/^[^\s]+\s/, "").trim() === countryInput ||
				c.name.toLowerCase().includes(countryInput)
			);
			if (country) {
				foundCountry = country;
				foundRegion = region.name;
				break;
			}
		}

		if (foundCountry) {
			const now = moment().tz(foundCountry.zone).format("HH:mm:ss - DD/MM/YYYY");
			const msg = `🌐 Giờ hiện tại ở ${foundCountry.name} (${foundRegion}):\n${now}`;
			return api.sendMessage(msg, threadID, messageID);
		} else {
			return api.sendMessage(`Không tìm thấy quốc gia "${args.join(" ")}" trong danh sách!`, threadID, messageID);
		}
	}

	// Nếu không có tham số, hiển thị danh sách khu vực
	let msg = "🌐 Chọn khu vực để xem giờ (trả lời với số):\n\n";
	regions.forEach((region, index) => {
		msg += `${index + 1}. ${region.name} (${region.countries.length} nước)\n`;
	});

	return api.sendMessage(msg, threadID, (error, info) => {
		global.client.handleReply.push({
			name: this.config.name,
			messageID: info.messageID,
			author: event.senderID,
			regions,
			threadID: event.threadID,
			originalMessageID: info.messageID,
		});
	});
};