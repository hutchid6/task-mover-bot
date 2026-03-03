const { channel } = require('diagnostics_channel');
const { Client, Events, Partials, GatewayIntentBits } = require('discord.js');
const fs = require("fs");
const { get } = require('https');
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
    let args = splitCommand.slice(1) // All other words are arguments/parameters/options for the command

    console.log("Command received: " + primaryCommand)
    console.log("Arguments: " + args) // There may not be any arguments

    if (primaryCommand == "channel-list") {
        channelList(args, receivedMessage)
    } else if (primaryCommand == "set-completed-channel") {
        setCompletedChannel(args, receivedMessage)
    } else if(primaryCommand == "help"){
        help(args, receivedMessage)
    } 
    else if(primaryCommand == "channel-connections-list"){
        showChannelConnections(args, receivedMessage)
    }
    else if(primaryCommand == "remove-completed-channel"){
        removeCompletedChannel(args, receivedMessage)
    }
    else {
        receivedMessage.channel.send("I don't understand the command. Try `!help`")
    }
}

function help(args, receivedMessage) {
    receivedMessage.channel.send(`This is a bot that aims to do the simple task of allowing you to react to a channel to copy that message from that channel, send it to a channel of your choice, then delete the original message. This was originally inteded for task management to allow you to check a message off in a task channel and send it automatically to a completed channel.

The emoji that you must react with in order to move a message is hard coded to ✅.

There are 5 commands:
    !help
    !channel-list
    !set-completed-channel
    !remove-completed-channel 
    !channel-connections-list

!help will give you a list of all the commands

!channel-list will give you a list of all the channels in your server and their ids

!set-completed-channel requires 1 argument. The argument required is the channel id from channel-list that you would like to 
set as the completed channel for the current channel you are in. In other words this command will link the channel that you 
execute the command in, to the channel with the id in the argument.
An example of using this command would be:
    !set-completed-channel 194315

!remove-completed-channel requires 1 argument. The argument required is the channel id from channel-list that you would like to 
remove as the completed channel for the current channel you are in. In other words this command will disconnect the channel that you 
execute the command in, from the channel with the id in the argument.
An example of using this command would be:
    !remove-completed-channel 194315

!channel-connections-list will give you a list of all the channel connections in your server. The id displayed is the id of the completed channel.

Finally, in order to let the bot actually delete messages, you must assign it a role with at least these 4 permissions:
View Channel
Read Message History
Send Messages
Manage Messages`);
}

function channelList(args, receivedMessage) {
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

function setCompletedChannel(args, receivedMessage) {
    if (args.length < 1) {
        receivedMessage.channel.send("Please use this command with the channel id that you'd like to connect to as an argument. Use !help for more details.")
        return
    }
    let newTaskAndCompletedChannel = [receivedMessage.channel.id, args[0]]
    let connectionExists = checkChannelConnectionExists(args[0], receivedMessage);
    if(!connectionExists){
        settings.taskAndCompletedChannels.push(newTaskAndCompletedChannel);
        let settingsJSON = JSON.stringify(settings);
        fs.writeFileSync("settings.json", settingsJSON);
        
        let completedChannelName = getChannelNameById(args[0], receivedMessage)
        let feedbackMessage = `${receivedMessage.channel.name}'s connected channel is now ${completedChannelName} (id: ${args[0]})`
        receivedMessage.channel.send(feedbackMessage);
    }
    else{
        let connectionData = getChannelConnection(receivedMessage)
        let completedChannelName = getChannelNameById(connectionData[1], receivedMessage)
        let feedbackMessage = `${receivedMessage.channel.name} is already connected to ${completedChannelName} (id: ${connectionData[1]})`
        receivedMessage.channel.send(feedbackMessage);
    }

    
}

function removeCompletedChannel(args, receivedMessage) {
    if (args.length < 1) {
        receivedMessage.channel.send("Please use this command with the channel id that you'd like to disconnect from as an argument. Use !help for more details.")
        return
    }

    let indexOfChannelConnection = getChannelConnectionIndex(args[0], receivedMessage);
    if(indexOfChannelConnection != -1){
        settings.taskAndCompletedChannels.splice(indexOfChannelConnection, 1);
        let settingsJSON = JSON.stringify(settings);
        fs.writeFileSync("settings.json", settingsJSON);

        let completedChannelName = getChannelNameById(args[0], receivedMessage)
        let feedbackMessage = `${receivedMessage.channel.name} is now disconnected from ${completedChannelName} (id: ${args[0]})`
        receivedMessage.channel.send(feedbackMessage);
    }
    else{
        let completedChannelName = getChannelNameById(args[0], receivedMessage)
        let feedbackMessage = `${receivedMessage.channel.name} was not connected to ${completedChannelName} (id: ${args[0]}) in the first place`
        receivedMessage.channel.send(feedbackMessage);
    }
    
}

function showChannelConnections(args, receivedMessage){
    
    let channelConnectionsString = ""
    settings.taskAndCompletedChannels.forEach((channelData) =>{
        let connectedChannelName = getChannelNameById(channelData[1], receivedMessage)
        let sendingChannelName = getChannelNameById(channelData[0], receivedMessage)
        channelConnectionsString += ` -- ${sendingChannelName}'s completed channel is ${connectedChannelName} (id: ${channelData[1]})\n`
    })
    if(channelConnectionsString == "")
    {
        channelConnectionsString = "There are no channel connections. Use !set-completed-channel to add some";
    }
    receivedMessage.channel.send(channelConnectionsString);
}

function getChannelNameById(id, receivedMessage){
    let completedChannelName = "[invalid channel]"
    receivedMessage.channel.guild.channels.cache.forEach((channel) => {
        if(channel.id.toString() == id){
            completedChannelName = channel.name;
        }
    })
    return completedChannelName;
}

function checkChannelConnectionExists(id, receivedMessage){
    let connectionExists = false
    settings.taskAndCompletedChannels.forEach((channelData) =>{
        if(channelData[0] == receivedMessage.channel.id){
            connectionExists = true;
        }
    })
    return connectionExists;
}

function getChannelConnection(receivedMessage){
    let existingChannelData = null
    settings.taskAndCompletedChannels.forEach((channelData) =>{
        if(channelData[0] == receivedMessage.channel.id){
            existingChannelData = channelData;
        }
    })
    return existingChannelData;
}

function getChannelConnectionIndex(id, receivedMessage){
    let connectionIndex = -1
    let counter = 0;
    settings.taskAndCompletedChannels.forEach((channelData) =>{
        if(channelData[0] == receivedMessage.channel.id && channelData[1] == id){
            connectionIndex = counter;
        }
        counter = counter + 1;
    })
    return connectionIndex;
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