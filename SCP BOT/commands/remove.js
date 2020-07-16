const axios = require('axios');
const Discord = require("discord.js");
const admin = require("firebase-admin");
const rblxFunctions = require("noblox.js");


exports.run = async (client, message, args, groupID) => {

	var db = admin.database();

	// command can only be ran in guild text channels
	if (message.channel.type === "dm") return message.channel.send(`That command can't be used through direct messages!`).then(message => message.delete({timeout: 5000, reason: "delete"}));

	// only users with the specified officer role can run the command
	if (!message.member.roles.cache.some(role => role.name === `${client.config.officer_role}`)) {
		return message.channel.send(`Sorry ${message.author}, but only users with the **${client.config.officer_role}** role can run that command!`).then(message => message.delete({timeout: 5000, reason: "delete"}));
	};

	// officer id
	var officer_rblx_id;

	// boolean for user id fetcher checker
	var flag = true;

	// make sure officer is verified with us!
	await axios.get(`${client.config.firebase_url}/verified_users/${message.author.id}.json`)
		.then(function (response) {
			// if null - user isn't verified
			if (response.data == null) {
				flag = false;
			} else {
				// user is verified, get id
				officer_rblx_id = response.data.rblx_id
			}
		}).catch(function (error) {
			// error, shouldn't happen tbh
			console.log(`Error - ${error} (add.js)`)
		})

	// user isn't verified
	if (flag == false) {
		var badEmbed = new Discord.MessageEmbed()
			.setColor(0xf54242)
			.setDescription(`You must verify yourself before you can run the **add** command!`)
		return message.reply(badEmbed).then(message => message.delete({timeout: 5000, reason: "delete"}))
	}

	// make sure number is a number and is between the specified numberss
	if (!args[1] || isNaN(Number(args[1])) || Number(args[1]) < 1 || Number(args[1]) > client.config.max_experiencePoints) {
		var badEmbed = new Discord.MessageEmbed()
			.setColor(0xf54242)
			.setDescription(`You must specify a number (1-${client.config.max_experiencePoints}) for me to remove ${client.config.experience_name} points from the specified users\n\n**${client.config.prefix}remove # username1, username2, etc**`)
		return message.reply(badEmbed).then(message => message.delete({timeout: 5000, reason: "delete"}))
	};

	// if no usernames present, error!
	if (!args[2]) {
		var badEmbed = new Discord.MessageEmbed()
			.setColor(0xf54242)
			.setDescription(`Please provide the ROBLOX username that you want to remove ${client.config.experience_name} from\n\n**${client.config.prefix}remove # username1, username2, etc**`)
		return message.reply(badEmbed).then(message => message.delete({timeout: 5000, reason: "delete"}));
	};

	// collect usernames into an array
	var userArray = message.content.slice(message.content.indexOf(message.content.split(" ")[2])).split(',');

	// remove duplicates
	userArray = Array.from(new Set(userArray));

	// number variable
	var addPoints = Number(args[1]);

	// tell user that we're still working on command..
	var workinEmbed = new Discord.MessageEmbed()
		.setDescription(`Working on updating ${userArray.length} user(s)...`)

	await message.channel.send(workinEmbed).then(message => message.delete({timeout: 4000, reason: "delete workin message"}));

	// all roles
	var roles;
	await axios.get(`https://api.roblox.com/groups/${groupID}`)
		.then(function (response) {
			roles = response.data.Roles;
		});

	// for loop to go through array
	for (i = 0; i < userArray.length; i++) {
		// username & id & boolean to get out
		var rblx_username = userArray[i].trim();
		var rblx_id;
		var flag = false;
		// grab id if possible
		await axios.get(`https://api.roblox.com/users/get-by-username?username=${rblx_username}`)
			.then(function (response) {
				// wow user doesn't exist
				if (response.data.success == false) {
					flag = true;
				} else {
					// user does exist
					rblx_username = response.data.Username;
					rblx_id = response.data.Id;
				}
			})

		// error message
		if (flag) {
			var badEmbed = new Discord.MessageEmbed()
				.setColor(0xf54242)
				.setDescription(`User **${rblx_username}** doesn't exist!`)
			message.channel.send(badEmbed);
			continue;
		};

		// get total points so far from profile
		var current_points;

		await axios.get(`${client.config.firebase_url}/guilds/${message.guild.id}/users/${rblx_id}.json`)
			.then(function (response) {
				if (response.data == null) {
					current_points = 0;
					flag = true;
				} else {
					current_points = Number(response.data.xp);
				}
			})

		// new total points added together
		var new_total_points = current_points - addPoints;

		if (new_total_points < 0){
			new_total_points = 0;
		}

		if (flag) {
			db.ref(`guilds/${message.guild.id}/users/${rblx_id}`).set({
				xp: Number(new_total_points)
			});

			// embed message to channel
			var doneEmbed = new Discord.MessageEmbed()
				.setColor(0xFF8C00)
				.setDescription(`Created ${rblx_username}'s profile`)
			await message.channel.send(doneEmbed)
		} else {
			db.ref(`guilds/${message.guild.id}/users/${rblx_id}`).set({
				xp: Number(new_total_points)
			});

			// embed message to channel
			var doneEmbed = new Discord.MessageEmbed()
				.setColor(0x28F6FF)
				.setDescription(`Updated ${rblx_username}'s profile`)
			await message.channel.send(doneEmbed)

		}

		var flag = true;

		while (flag) {
			// user's current roleset id
			var current_rolesetID;

			// fetch data
			await axios.get(`https://api.roblox.com/users/${rblx_id}/groups`)
				.then(function (response) {
					var flag = false;
					for (new_i = 0; new_i < response.data.length; new_i++) {
						if (response.data[new_i].Id == groupID) {
							flag = true;
							current_rolesetID = response.data[new_i].Rank;
							break;
						}
					}

					if (flag == false) {
						current_rolesetID = 0;
					}
				});


			// next roleset id
			var previous_rolesetID = 0;
			var previous_rolesetName;

			for (not_i = 0; not_i < roles.length; not_i++) {
				if (roles[not_i].Rank == current_rolesetID && current_rolesetID !== 255) {
					previous_rolesetID = roles[not_i - 1].Rank;
					previous_rolesetName = roles[not_i - 1].Name;
					break;
				} else if (current_rolesetID == 255) {
					previous_rolesetID = -2;
					break;
				}
			}

			if (previous_rolesetID >= 1 && client.config.demoteUsers == true) {
				var previousRank_xp;

				// user is not owner or guest
				await axios.get(`${client.config.firebase_url}/guilds/${message.guild.id}/role_xp/${previous_rolesetID}.json`)
					.then(function (response) {
						previousRank_xp = response.data.xp
					});

				if (previousRank_xp !== -1) {
					if (new_total_points <= previousRank_xp) {
						await rblxFunctions.setRank({ group: groupID, target: rblx_id, rank: previous_rolesetID }).then(async function() {
							var promotionEmbed = new Discord.MessageEmbed()
							.setColor(0xf54242)
							.setDescription(`**:confetti_ball: \`${rblx_username}\` has been demoted to \`${previous_rolesetName}\`! :confetti_ball:**`)
						await message.channel.send(promotionEmbed)
						flag = false
						}).catch(async function() {
							var badEmbed = new Discord.MessageEmbed()
							.setColor(0xf54242)
							.setDescription(`**:confetti_ball: \`${rblx_username}\` has needs to be demoted to \`${previous_rolesetName}\`, however there is an error demoting them! :confetti_ball:**`)

							await message.channel.send(badEmbed);
							flag = false
						})

					} else {
						flag = false;
					}
				} else {
					flag = false;
				}
			} else {
				flag = false;
			}
		}
	}

	return message.channel.send(`Updated everyone's profile!`).then(message => message.delete({timeout: 5000, reason: "delete"}));
};

exports.info = {
	names: ["remove", "deduct"],
	usage: 'remove <#> <rblx_username>',
	description: "Remove xp from user's profile"
};
