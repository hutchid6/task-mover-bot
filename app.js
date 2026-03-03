const { Client, Events, Partials, GatewayIntentBits } = require('discord.js');
const fs = require("fs");
require('dotenv').config({ path: 'token.env' });

const BOT_KEY = process.env.BOT_KEY;

let settingsJSON = fs.readFileSync("settings.json");
let settings = JSON.parse(settingsJSON);

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.MessageContent],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.once(Events.ClientReady, readyClient => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
    console.log("Servers:");
    client.guilds.cache.forEach((guild) => {
        console.log(" - " + guild.name);
        guild.channels.cache.forEach((channel) => {
            console.log(` -- ${channel.name} (${channel.type}) - ${channel.id}`);
        });
    });
    console.log("Connections: " + JSON.stringify(settings.taskAndCompletedChannels));
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'help') {
        await help(interaction);
    } else if (commandName === 'channel-list') {
        await channelList(interaction);
    } else if (commandName === 'set-completed-channel') {
        await setCompletedChannel(interaction);
    } else if (commandName === 'remove-completed-channel') {
        await removeCompletedChannel(interaction);
    } else if (commandName === 'channel-connections-list') {
        await showChannelConnections(interaction);
    }
});

async function help(interaction) {
    await interaction.reply(`This bot allows you to react to a message with ✅ to automatically move it to a connected destination channel. Originally designed for task management — react to complete a task and it gets moved to a completed channel.

**Commands:**
\`/help\` — Show this message
\`/channel-list\` — List all channels and their IDs
\`/set-completed-channel\` — Link the current channel to a destination channel
\`/remove-completed-channel\` — Remove a link between channels
\`/channel-connections-list\` — Show all configured channel connections

**Permissions required for the bot:**
View Channel, Read Message History, Send Messages, Manage Messages`);
}

async function channelList(interaction) {
    let channelListString = "";
    interaction.guild.channels.cache.forEach((channel) => {
        channelListString += ` -- ${channel.name} (${channel.type}) - ${channel.id}\n`;
    });
    await interaction.reply({ content: channelListString, ephemeral: true });
}

async function setCompletedChannel(interaction) {
    const targetChannel = interaction.options.getChannel('channel');
    const sourceChannelId = interaction.channelId;

    if (!checkChannelConnectionExists(sourceChannelId)) {
        settings.taskAndCompletedChannels.push([sourceChannelId, targetChannel.id]);
        fs.writeFileSync("settings.json", JSON.stringify(settings));
        await interaction.reply(`**${interaction.channel.name}** is now connected to **${targetChannel.name}**. React with ✅ to move messages there.`);
    } else {
        const connectionData = getChannelConnection(sourceChannelId);
        const connectedName = getChannelNameById(connectionData[1]);
        await interaction.reply(`**${interaction.channel.name}** is already connected to **${connectedName}**. Remove it first with \`/remove-completed-channel\`.`);
    }
}

async function removeCompletedChannel(interaction) {
    const targetChannel = interaction.options.getChannel('channel');
    const sourceChannelId = interaction.channelId;

    const index = getChannelConnectionIndex(sourceChannelId, targetChannel.id);
    if (index !== -1) {
        settings.taskAndCompletedChannels.splice(index, 1);
        fs.writeFileSync("settings.json", JSON.stringify(settings));
        await interaction.reply(`**${interaction.channel.name}** is now disconnected from **${targetChannel.name}**.`);
    } else {
        await interaction.reply(`**${interaction.channel.name}** was not connected to **${targetChannel.name}**.`);
    }
}

async function showChannelConnections(interaction) {
    let channelConnectionsString = "";
    settings.taskAndCompletedChannels.forEach(([srcId, dstId]) => {
        const srcName = getChannelNameById(srcId);
        const dstName = getChannelNameById(dstId);
        channelConnectionsString += ` -- **${srcName}** → **${dstName}**\n`;
    });
    if (channelConnectionsString === "") {
        channelConnectionsString = "No channel connections configured. Use `/set-completed-channel` to add one.";
    }
    await interaction.reply(channelConnectionsString);
}

function getChannelNameById(id) {
    return client.channels.cache.get(id)?.name ?? '[invalid channel]';
}

function checkChannelConnectionExists(sourceChannelId) {
    return settings.taskAndCompletedChannels.some(([src]) => src === sourceChannelId);
}

function getChannelConnection(sourceChannelId) {
    return settings.taskAndCompletedChannels.find(([src]) => src === sourceChannelId) ?? null;
}

function getChannelConnectionIndex(sourceChannelId, targetChannelId) {
    return settings.taskAndCompletedChannels.findIndex(
        ([src, tgt]) => src === sourceChannelId && tgt === targetChannelId
    );
}

client.on(Events.MessageReactionAdd, async (reaction, user) => {
    if (reaction.partial) {
        try {
            await reaction.fetch();
        } catch (error) {
            console.error('Something went wrong when fetching the message:', error);
            return;
        }
    }

    console.log(`${reaction.message.author}'s message "${reaction.message.content}" gained a reaction!`);
    console.log(`${reaction.count} user(s) have given the same reaction to this message!`);

    if (reaction.emoji.name === '✅') {
        for (const [srcId, dstId] of settings.taskAndCompletedChannels) {
            if (srcId === reaction.message.channel.id) {
                const completedChannel = client.channels.cache.get(dstId);
                completedChannel.send(reaction.message.content);
                reaction.message.delete()
                    .then(() => console.log('Message deleted'))
                    .catch(console.error);
            }
        }
    }
});

client.login(BOT_KEY);
