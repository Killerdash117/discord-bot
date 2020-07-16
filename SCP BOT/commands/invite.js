const Discord = require("discord.js");

exports.run = async (client, message, args) => {

	var inviteEmbed = new Discord.MessageEmbed()
    .setColor(0x28f6ff)
    .setDescription(
      `**Pick up the source code @ https://github.com/nishi7409/Auxiliary**`
    );
	return message.channel.send(inviteEmbed);
};

exports.info = {
    names: ["invite"],
    usage: 'invite',
    description: "Invite the bot to your server"
};

