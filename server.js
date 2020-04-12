/* eslint-disable no-undef */
const Telegraf = require('telegraf');
const request = require('request');

const Extra = require('telegraf/extra');
const session = require('telegraf/session');
const Stage = require('telegraf/stage');
const Scene = require('telegraf/scenes/base');

const { leave } = Stage;
const { API_TOKEN } = process.env;
const PORT = process.env.PORT || 3000;
const URL = process.env.URL || 'https://critterpedia-bot.herokuapp.com'
const bot = new Telegraf(API_TOKEN);

if (process.env.DYNO) {
    // Running on Heroku
    bot.telegram.setWebhook(`${URL}/bot${API_TOKEN}`);
    bot.startWebhook(`/bot${API_TOKEN}`, null, PORT);
} else {
    bot.startPolling();
}

const url = 'https://bottleneckco.github.io/sg-scraper/acnh.json';
let data = null;
request({
  url,
  json: true,
}, (error, response, body) => {
  if (!error && response.statusCode === 200) {
    data = body;
  }
});

bot.start((ctx) => ctx.reply ('Hi \nSearch using /items'))

//Functions

function getOptions(data){
    const names = [];
    for(item of data){
        names.push([item.name]);
    }
    names.sort();
    return names;
}

//Scenes
const items = new Scene('items');
items.enter((ctx) => ctx.reply('Select Item Type', Extra.markup(markup => markup.resize()
    .keyboard([
        ['Fish'],
        ['Bug'],
    ])
)));


const search = new Scene('search');
    search.enter((ctx) => ctx.reply('Select Item', Extra.markup(markup => markup
    .keyboard(
    getOptions(ctx.session.data),
))));

search.on('message',(ctx)=>{
    const result = ctx.session.data
    .filter(item => item.name === ctx.update.message.text);

    if (result.length === 0){
        ctx.reply('No data. Enter /items', Extra.markup((m) => m.removeKeyboard()));
        ctx.scene.leave();
        return;
    }
    ctx.reply(`Name: ${ctx.update.message.text}\nLocation: ${result[0].location}\nSell Price: ${result[0].sellPrice}\nSeason: ${result[0].season}\nTime: ${result[0].time}`)
    ctx.reply('Enter /items to search for another item',  Extra.markup((m) => m.removeKeyboard()));
    ctx.scene.leave();
})


items.on('message', (ctx) =>{
    if (data === null){
        ctx.reply('No data. Enter /items', Extra.markup((m) => m.removeKeyboard()));
        ctx.scene.leave();
        return;
    }
    const itemsResult = data
    .filter(item => item.type === ctx.update.message.text)

    console.log(itemsResult);
    if (itemsResult.length === 0){
        ctx.reply('No data. Enter /items', Extra.markup((m) => m.removeKeyboard()));
        ctx.scene.leave();
        return;
    }
    ctx.session.data = itemsResult;
    console.log(getOptions(ctx.session.data));
    ctx.scene.leave();
    ctx.scene.enter('search');
});


// Create scene manager
const stage = new Stage();
stage.command('cancel', leave());
stage.register(items);
stage.register(search);

// Scene registration
bot.use(session());
bot.use(stage.middleware());
bot.command('items', (ctx)=> ctx.scene.enter('items'))