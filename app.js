const { Client, Events, Partials, GatewayIntentBits } = require('discord.js');
const fs = require("fs");
const { compileFunction } = require('vm');
require('dotenv').config({ path: 'token.env' }); // if you're using token.env

// Access environment variables
const BOT_KEY = process.env.BOT_KEY;

let settingsJSON = fs.readFileSync("settings.json")
let settings = JSON.parse(settingsJSON);

const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
	partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.once(Events.ClientReady, readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on('ready', () => {
    // List servers the bot is connected to
    console.log("Servers:")
    client.guilds.cache.forEach((guild) => {
        console.log(" - " + guild.name)

        // List all channels
        guild.channels.cache.forEach((channel) => {
            console.log(` -- ${channel.name} (${channel.type}) - ${channel.id}`)
        })
    })
    console.log("completed channel ids are " + settings.taskAndCompletedChannels);
})


client.on('messageCreate', (receivedMessage) => {
    if (receivedMessage.author == client.user) { // Prevent bot from responding to its own messages
        return
    }
    
    if (receivedMessage.content.startsWith("!")) {
        processCommand(receivedMessage)
    }
})

function processCommand(receivedMessage) {
    let fullCommand = receivedMessage.content.substr(1) // Remove the leading exclamation mark
    let splitCommand = fullCommand.split(" ") // Split the message up in to pieces for each space
    let primaryCommand = splitCommand[0] // The first word directly after the exclamation is the command
    let arguments = splitCommand.slice(1) // All other words are arguments/parameters/options for the command

    console.log("Command received: " + primaryCommand)
    console.log("Arguments: " + arguments) // There may not be any arguments

    if (primaryCommand == "channel-list") {
        channelList(arguments, receivedMessage)
    } else if (primaryCommand == "set-completed-channel") {
        setCompletedChannel(arguments, receivedMessage)
    } else if(primaryCommand == "help"){
        help(arguments, receivedMessage)
    } 
    else {
        receivedMessage.channel.send("I don't understand the command. Try `!help` or `!multiply`")
    }
}

function help(arguments, receivedMessage) {
    receivedMessage.channel.send(`This is a bot that aims to do the simple task of allowing you to react to a channel to copy that message from that channel, send it to a channel of your choice, then delete the original message. This was originally inteded for task management to allow you to check a message off in a task channel and send it automatically to a completed channel.

The emoji that you must react with in order to move a message is hard coded to ✅.

There are 3 commands:
    !help
    !channel-list
    !set-completed-channel

!help will give you a list of all the commands

!channel-list will give you a list of all the channels in your server and their ids

!set-completed-channel requires 1 argument. The argument required is the channel id from channel-list that you would like to 
set as the completed channel for the current channel you are in. In other words this command will link the channel that you 
execute the command in, to the channel with the id in the argument.
An example of using this command would be:
    !set-completed-channel 194315

Finally, in order to let the bot actually delete messages, you must assign it a role with at least these 4 permissions:
View Channel
Read Message History
Send Messages
Manage Messages`);
}

function channelList(arguments, receivedMessage) {
    let channelListData = []
    receivedMessage.channel.guild.channels.cache.forEach((channel) => {
        currentChannelData = {channelName: channel.name,
            channelType: channel.type,
            channelID: channel.id
        }
        channelListData.push(currentChannelData);
            //receivedMessage.channel.send(` -- ${channel.name} (${channel.type}) - ${channel.id}`)
    })
    let channelListString = ""
    channelListData.forEach((currentChannelData) =>{
        channelListString += ` -- ${currentChannelData.channelName} (${currentChannelData.channelType}) - ${currentChannelData.channelID}\n`
    })
    receivedMessage.channel.send(channelListString);
}

function setCompletedChannel(arguments, receivedMessage) {
    if (arguments.length < 1) {
        receivedMessage.channel.send("Please use this command with the channel id that you'd like to connect to as an argument. Use !help for more details.")
        return
    }
    let newTaskAndCompletedChannel = [receivedMessage.channel.id, arguments[0]]
    settings.taskAndCompletedChannels.push(newTaskAndCompletedChannel);
    let settingsJSON = JSON.stringify(settings);
    fs.writeFileSync("settings.json", settingsJSON);
}

client.on(Events.MessageReactionAdd, async (reaction, user) => {
	// When a reaction is received, check if the structure is partial
	if (reaction.partial) {
		// If the message this reaction belongs to was removed, the fetching might result in an API error which should be handled
		try {
			await reaction.fetch();
		} catch (error) {
			console.error('Something went wrong when fetching the message:', error);
			// Return as `reaction.message.author` may be undefined/null
			return;
		}
	}

	// Now the message has been cached and is fully available
	console.log(`${reaction.message.author}'s message "${reaction.message.content}" gained a reaction!`);
	// The reaction is now also fully available and the properties will be reflected accurately:
	console.log(`${reaction.count} user(s) have given the same reaction to this message!`);
    if(reaction.emoji.name == '✅'){
        for(let i = 0; i < settings.taskAndCompletedChannels.length; i++){
            console.log(settings.taskAndCompletedChannels[i][0] + " vs " + reaction.message.channel.id);
            if(settings.taskAndCompletedChannels[i][0] == reaction.message.channel.id){
                let completedChannel = client.channels.cache.get(settings.taskAndCompletedChannels[i][1]);
                completedChannel.send(reaction.message.content);
                reaction.message.delete()
                    .then(() => console.log('Message deleted'))
                    .catch(console.error);
            }
        }
    }

});

client.login(BOT_KEY);