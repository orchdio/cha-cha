import _ from 'lodash'
// @ts-ignore
import extractUrls from 'extract-urls';
import moment from 'moment'
import axios from "axios";
import {Track, TrackConversion} from "../blueprint";
import {getLinkPreview} from "link-preview-js";
import * as dns from "node:dns";
import { AckFn, AppMentionEvent, SayFn } from '@slack/bolt';
import { AckArgs } from '@slack/bolt/dist/receivers/HTTPResponseAck';

// platform emojis. empty for now
const platformEmojis = {
    deezer:"",
    applemusic: "",
    spotify: "",
    tidal: "",
    ytmusic: ""
}

// hacky function (for now), this function sanitizes the platform text labellings
function sanitizePlatform(text: string) {
    const platform = _.capitalize(text)
    if (platform === 'Ytmusic') {
        return 'YouTube Music'
    }
    if (platform === 'Applemusic') {
        return 'Apple Music'
    }
    return platform
}

async function fetchLinkPreview(link: string) {
    let isShortLink = ['deezer.page.link', 'link.tospotify.com'].some((shortLink) => link.includes(shortLink))

    if (isShortLink) {
        console.log('it is a shortlink...')
            // @ts-ignore
        const { url: previewURL } = await getLinkPreview(url, {
            resolveDNSHost: async url => {
                const { hostname } = new URL(url);
                return dns.lookup(hostname, (err, addr) => {
                    if (err) {
                        console.log('Error getting link preview')
                        throw err
                    }

                    return addr
                })
            }, followRedirects: 'follow'
        } as string | void // because typescript. :(
        )
        return previewURL
    }
    return link
}

async function convertTrackAndBuildBlockResponse(link: string) {
    const { data } = await axios({
        method: 'GET',
        url: `${process.env.ORCHDIO_BASE_URL}/api/v1/track/convert?link=${link}`,
        headers: {
            'Content-Type': 'application/json',
            'x-orchdio-key': process.env.ORCHDIO_API_KEY
        }
    });

    const response: TrackConversion = data
    // rely with rich text cards for track conversion.
    const blockResponse = BuildTrackConversionBlock(response)
    return blockResponse
}

async function convertTrack(text: string, username: string) {
    const link = extractUrls(text, true)
    if (!link) {
        return
    }

    let url = await fetchLinkPreview(link[0]);
    
    // reply to track conversion.
    if (!url.includes('playlist')) {
        const blockResponse = await convertTrackAndBuildBlockResponse(url)
        return blockResponse
    }
}

function BuildTrackConversionBlock(payload: TrackConversion) {
    const scaffold = {
        "text": "Hey",
        "blocks": []
    }

    // this makes picks only results that have values with them
    // the expected data is in the format:
    //  {
    //    "platform": result for platform
    //  }
    // if the result is not found for the platform, the value for the platform would be null
    const filteredData = _.pickBy(payload.data.platforms, x => Object.values(x).length > 0)

    const tracks: Track[] = Object.values(filteredData)
    const platforms: string[] = Object.keys(filteredData)


    // the card header
    scaffold.blocks.push({
        "type": "section",
        "text": {
            "type": "mrkdwn",
            "text": `I found *${platforms.length}* results for you from ${platforms.join(', ')}.`
        }
    })

    // rest of the track card
    for (const [index, t] of tracks.entries()){
        const platform = sanitizePlatform(platforms[index])
        scaffold.blocks.push(
            {
                "type": "divider"
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `*${platform}*`
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `*<${t.url}|${t.title}>*\n${t.artistes.join(', ')}\n${t.album} ${moment(t.released).isValid() ? '· ' + moment(t.released).format('YYYY') : ''}\n${t.duration}`
},
                "accessory": {
                    "type": "image",
                    "image_url": `${t.cover}`,
                    "alt_text": `the cover art for the track ${t.title} by ${t.artistes.join(', ')}`
                }
            },
            {
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {
                            "type": "plain_text",
                            "text": `:link: Link on ${platform}`,
                            "emoji": true
                        },
                        "value": `${t.url}`,
                        "url": t.url,
                        "action_id": "button-action"
                    }
                ]
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `You can add this track to playlists on your streaming platforms and more <https://zoove.xyz?u=${payload.data.short_url}|here>. Powered by Orchdio.`
                }
            },
            {
                "type": "divider"
            })
    }
    return scaffold
}

async function ConvertTrackAndReply(say: SayFn, ack: AckFn<AckArgs>, text: string, username: string) {
    await ack()
    const link = extractUrls(text, true)
    if (!link) {
        await say(`Sorry, ${username} I cannot do that :robot_face:`)
        return
    }

    await say(`Fetching the links for you... hang on tight :rocket: ....`)
    // convert tracks first
    let url = await fetchLinkPreview(link[0]);
    let entity = 'track';
    
    // reply to track conversion.
    if (!url.includes('playlist')) {
        const blockResponse = await convertTrackAndBuildBlockResponse(url)
        await say(blockResponse)
        return
    }
    // we want to make sure that the message contains links that can be converted.
    await say(`Hey, <@${username}>! I cannot convert that yet.`)   
}

async function ReplyToMessage(event: AppMentionEvent, say: SayFn) {
    const { text, user: username, channel, event_ts } = event;

    if (event_ts === "1515449522000016") {
        const blockResponse = await convertTrack(text, username)
        if (blockResponse) {
            await say(blockResponse)
            return
        }
        await say(`Hey, <@${username}>! I cannot convert that yet :robot_face:`)
        return
    }
    await say(`:robot_face:`)
}

async function ReplyToSlashCommand({ command, ack, say }) {
    try {
        console.log('Incoming Slack command', { command })
        const { text } = command;
        await ConvertTrackAndReply(say, ack, text, command.user_name)
        // we want to make sure that the message contains links that can be converted.
    } catch (err) {
        // check for invalid link in the message.
        if (err?.name === 'TypeError' && err.message.includes('Invalid URL')) {
            console.log('Invalid link');
            await say(`Seems the link you pasted is invalid. Please make sure the link is valid and try again.`);
        }
        console.log("Error here", err)
    }
}

export { ReplyToSlashCommand, ReplyToMessage }