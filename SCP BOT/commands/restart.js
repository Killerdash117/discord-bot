const axios = require("axios");

exports.run = async (client, message, args) => {

	// only client.config.owner_id can run this! (bot commander, not guild owner)
	if (message.author.id !== client.config.owner_id) return message.channel.send(`Sorry ${message.author}, but only the owner of this bot can run that command!`);

	// restart
	process.exit();

};

exports.info = {
    names: ["restart"],
    usage: 'restart',
    description: "Restart the bot"
};