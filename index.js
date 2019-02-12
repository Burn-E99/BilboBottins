// Load up the discord.js library
const Discord = require("discord.js");
const cheerio = require("cheerio");
const request = require("request");
const wtf = require("wtf_wikipedia");
const fs = require("fs");
const readline = require("readline");

// This is your client. Some people call it `bot`, some people call it `self`, 
// some might call it `cootchie`. Either way, when you see `client.something`, or `bot.something`,
// this is what we're refering to. Your client.
const client = new Discord.Client();

// Here we load the config.json file that contains our token and our prefix values. 
const config = require("./config.json");
// config.token contains the bot's token
// config.prefix contains the message prefix.

// Here we load the package.json file containing the version number
const package = require("./package.json");

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

client.on("ready", () => {
  // This event will run if the bot starts, and logs in, successfully.
  log2Discord(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.\nBot version is ${package.version}`);
  // Example of changing the bot's playing game to something useful. `client.user` is what the
  // docs refer to as the "ClientUser".
  client.user.setActivity(`Serving ${client.guilds.size} servers`);
});

client.on("guildCreate", guild => {
  // This event triggers when the bot joins a guild.
  log2Discord(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
  client.user.setActivity(`Serving ${client.guilds.size} servers`);
});

client.on("guildDelete", guild => {
  // this event triggers when the bot is removed from a guild.
  log2Discord(`I have been removed from: ${guild.name} (id: ${guild.id})`);
  client.user.setActivity(`Serving ${client.guilds.size} servers`);
});

client.on("error", log2Discord);

client.on("message", async message => {
  // This event will run on every single message received, from any channel or DM.
  
  // It's good practice to ignore other bots. This also makes your bot ignore itself
  // and not get into a spam loop (we call that "botception").
  if(message.author.bot) return;
  
  // Also good practice to ignore any message that does not start with our prefix, 
  // which is set in the configuration file.
  if(message.content.indexOf(config.prefix) !== 0) return;
  
  // Here we separate our "command" name, and our "arguments" for the command. 
  // e.g. if we have the message "+say Is this the real life?" , we'll get the following:
  // command = say
  // args = ["Is", "this", "the", "real", "life?"]
  const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();
  
  // Let's go with a few common example commands! Feel free to delete or change those.
  
  if(command === "ping" || command === "") {
    // Calculates ping between sending a message and editing it, giving a nice round-trip latency.
    // The second ping is an average latency between the bot and the websocket server (one-way, not round-trip)
    const m = await message.channel.send("Ping?");
    m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ping)}ms`);
  }

  // bb:w[lang,where to send,how much to send]
  /*
    help: shows this
    lang: en(default), de, etc
    where to send: here(default) (current channel), self (to author of command), both (current channel and author of command (author recieves all))
    how much to send to channel: intro(default) (only first section), sections## (sections 0-##), all (only available to users with Bobbit role or if user called BilboBottins in a designated bot-spam channel)
  */
  if(command === "w" || command.startsWith("w[")) {
    // Shows a wikipedia article

    // adjust language to be inside settings block
    let lang = "";
    if(args[0].startsWith('-')) {
      lang = args[0].substr(1);
      args.unshift();
    } else {
      lang = "en";
    }
    const title = args.join(" ");
    const m = await message.channel.send("Looking for page with title \"" + title + "\".");
    wtf.fetch(title, lang, {'Api-User-Agent': 'BilboBottins'})
    .then((doc) => {
      if(!doc) {
        m.edit("Page with title \"" + title + "\" not found.");
        return;
      }
      m.delete();
      const messages = split2k(doc.text());
      for(let i=0;i<messages.length;i++) {
        message.channel.send(messages[i]);
      }
      message.channel.send("---- Done! ----")
    })
    .catch((err) => {
      console.log(err);
      m.edit("Something really broke....");
    })
  }

  if(command === "l") {
    // Shows content of link
    const m = await message.channel.send("Loading " + args[0]);
    request(args[0], function(err, res, body) {
      m.edit("loaded");
      console.log(cheerio.load(body).html());
    });
  }

  if(command === "tf") {
    // DMs user text formatting information
    await message.channel.send("Direct messaging " + message.author + " Discord's text formatting rules.")
    fs.readFile('./textFormatting.txt', 'utf8', function(err, contents) {
      message.author.send(contents);
    });
  }

  if(command === "test") {
    await message.channel.send("This is testing, and its feature *WILL* change.");
    await message.channel.send("Current feature: Direct channel sending.\n");

    client.channels.get("542497765146492929").send("Testing");
  }
});

client.login(config.token);

function split2k(chunk) {
  let bites = [];
  while(chunk.length > 2000) {
    // take 2001 chars to see if word magically ends on char 2000
    let bite = chunk.substr(0, 2001);
    const etib = bite.split("").reverse().join("");
    const lastI = etib.indexOf(" ");
    if(lastI > 0) {
      bite = bite.substr(0, 2000 - lastI);
    } else {
      bite = bite.substr(0, 2000);
    }
    bites.push(bite);
    chunk = chunk.slice(bite.length);
  }
  // Push leftovers into bites
  bites.push(chunk);

  return bites;
}

function log2Discord(message) {
  console.log(Date());
  console.log(message);
  const messages = split2k(message);
  for(let i=0;i<messages.length;i++) {
    client.channels.get("542497765146492929").send(messages[i]);
  }
}

function searchPrompt() {
  rl.question("cmd> ", input => {
    const args = input.split(" ");
    command = args.shift();
    if(input == 'exit') {
      return rl.close();
    }
    if(command == "m") {
      try {
        const channelID = args.shift();
        args.join(" ");
        const messages = split2k(args);
        for(let i=0;i<messages.length;i++) {
          client.channels.get(channelID).send(messages[i]);
        }
      }
      catch(e) {
        console.error(e);
      }
    }

    console.log("You entered: ", input);
    searchPrompt();
  });
}
searchPrompt();