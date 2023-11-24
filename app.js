const { createBot, createProvider, createFlow, addKeyword } = require('@bot-whatsapp/bot')
const axios = require('axios')
const MetaProvider = require('@bot-whatsapp/provider/meta')
const MockAdapter = require('@bot-whatsapp/database/mock')
const { EVENTS } = require('@bot-whatsapp/bot/lib/bundle.bot.cjs')
const fs = require('fs')
const path = require('path')
require('dotenv').config()
const fetch = require('node-fetch')
global.fetch = fetch



const chatState = {
    queue: [],
    optionsGPT: { model: 'gpt-3.5-turbo' },
    openai: null,
}

const initializeChat = async () => {
    const { ChatGPTAPI } = await import('chatgpt')
    chatState.openai = new ChatGPTAPI({
        apiKey: process.env.OPENIA_KEY
    });
}

const sendMessageToChatGPT = async (ctx) => {
    console.log(ctx)
    const { queue, openai } = chatState
    const lastMessage = queue.length ? queue[queue.length - 1] : null
    const conversationOptions = {
        conversationId: lastMessage ? lastMessage.conversationId : undefined,
        parentMessageId: lastMessage ? lastMessage.id : undefined,
    }
    const message = ctx.serie ? `que tal soy un usuario que te va a ${ctx.serie} para la siguiente pregunta, 
     quiero que ignores todo esto menos el numero de serie la pregunta es la siguiente : ${ctx.message}.
     Ahora quiero que en la respuesta puedas integrar el numero de serie como por ej: Lo siento por el inconveniente con tu impresora con el numero de serie ${ctx.serie}. 
     Aquí hay algunos pasos que puedes seguir para resolver el atasco de papel: 1. Apaga y desenchufa la impresora etc.... 
     `: `${ctx.message}`
    const completion = await openai.sendMessage(message, conversationOptions)

    queue.push(completion)
    const parseMessage = {
        ...completion,
        answer: completion.text
    };
    return parseMessage.answer

};

// const openIAReq = async (ctx) => {

//     // console.log(ctx)
//     // let openia_data = JSON.stringify({
//     //     model: "gpt-3.5-turbo",
//     //     messages: [
//     //         {
//     //             role: "system",
//     //             content: "Tu eres un asistente muy util",
//     //         },
//     //         {
//     //             role: "user",
//     //             content: ctx.serie?`que tal soy un usuario que te va a entregar un numero de serie que es ${ctx.serie} para la siguiente pregunta, quiero que ignores todo esto menos el numero de serie la pregunta es la siguiente : ${ctx.message}. Ahora quiero que en la respuesta puedas integrar el numero de serie como por ej: Lo siento por el inconveniente con tu impresora con el numero de serie ${ctx.serie}.  Aquí hay algunos pasos que puedes seguir para resolver el atasco de papel: 1. Apaga y desenchufa la impresora. 
//     //              2. Abre la cubierta de acceso a los cartuchos de tinta o tóner y retira cualquier papel que puedas ver.
//     //              3. Si el .....`:`que tal soy un usuario que te va a entregar una pregunta y el contexto es dar soporte a impresoras quiero que ignores esto la pregunta es la siguiente: ${ctx.message}`,
//     //         },
//     //     ],
//     // });
//     // let config = {
//     //     maxBodyLength: Infinity,
//     //     headers: {
//     //         "Content-Type": "application/json",
//     //         Authorization:
//     //             `Bearer ${process.env.OPENIA_KEY}`,
//     //     }
//     // }
//     // const { data } = await axios.post("https://api.openai.com/v1/chat/completions", openia_data, config)
//     // return data.choices[0].message.content

//     // // queue = []
//     // openai = undefined
//     // const { ChatGPTAPI } = await import('chatgpt')
//     // openai = new ChatGPTAPI({ apiKey: process.env.OPENIA_KEY })
//     // const completion = await openai.sendMessage(ctx.message, {
//     //     conversatioId: !queue.length
//     //         ? undefined
//     //         : queue[queue.length - 1].conversatioId,
//     //     parentMessageId: !queue.length
//     //         ? undefined
//     //         : queue[queue.length - 1].id
//     // })
//     // queue.push(completion)
//     // const parseMessage = {
//     //     ...completion,
//     //     answer: completion.text
//     // }
//     // console.log(parseMessage)


//     // const { ChatGPTAPI } = await import('chatgpt')
//     // const api = new ChatGPTAPI({ apiKey: process.env.OPENIA_KEY })
//     // let res = await api.sendMessage(ctx.message)
//     // console.log(res)
//     // console.log(res.text)

//     // if (!ctx.serie) {
//     //     console.log('segunda')
//     //     res = await api.sendMessage(ctx.message, {
//     //         parentMessageId: res.id
//     //     })
//     //     console.log(res.text)
//     //     console.log(res)
//     //}
//     // await initializeChat()
//     // const { ChatGPTAPI } = await import('chatgpt');

//     // const chatState = {
//     //   queue: [],
//     //   optionsGPT: { model: 'gpt-3.5-turbo' },
//     //   openai: null,
//     // };

//     // const initializeChat = async () => {
//     //   chatState.openai = new ChatGPTAPI({
//     //     apiKey: process.env.OPENIA_KEY
//     //   });
//     // };

//     //   const { queue, openai } = chatState;

//     //   const completion = await openai.sendMessage(message, {
//     //     conversationId: queue.length ? queue[queue.length - 1].conversationId : undefined,
//     //     parentId: queue.length ? queue[queue.length - 1].id : undefined,
//     //   });

//     //   queue.push(completion);

//     //   const parseMessage = {
//     //     ...completion,
//     //     answer: completion.text
//     //   };

//     //   console.log(parseMessage);

//     //   return parseMessage;

// }

const ImgDownloadReq = async (ctx) => {
    try {
        const imageUrl = ctx.url;
        const imageBuffer = await downloadImage(imageUrl);

        const imagePath = saveImage(imageBuffer, ctx.from);

        const base64Image = imageBuffer.toString('base64');
        const text = await performTextRecognition(base64Image);
        return text;
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
};

const downloadImage = async (url) => {
    const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
            'Authorization': `Bearer ${process.env.WHATSAPP_API}`
        }
    });

    return response.data;
}

const saveImage = (imageBuffer, userId) => {
    const imagePath = `./public/img/imagen_${userId}.jpg`;
    const fullPath = path.join(__dirname, imagePath);
    fs.writeFileSync(fullPath, Buffer.from(imageBuffer));
    return imagePath;
}

const performTextRecognition = async (base64Image) => {
    let data = JSON.stringify({
        "requests": [
            {
                "image": {
                    "content": base64Image
                },
                "features": [
                    {
                        "type": "DOCUMENT_TEXT_DETECTION"
                    }
                ]
            }
        ]
    });

    const response = await axios.post(`https://vision.googleapis.com/v1/images:annotate?key=${process.env.GCVISION_API}`, data, {
        headers: {
            'Content-Type': 'application/json'
        }
    })

    const { ChatGPTAPI } = await import('chatgpt')
    const api = new ChatGPTAPI({
        apiKey: process.env.OPENIA_KEY
    })
    const message = await response.data.responses[0].textAnnotations[0].description
    const res = await api.sendMessage(`tengo el siguiente texto y quiero saber cual es el numero de serie,
         esto lo utilizare para sacar el numero de serie de una imagen pasada por un ocr y 
         quiero que tu respuesta solo sea el numero de serie osea que no quiero mas texto que el de la serie, el texto es el siguiente : ${message}`)
    console.log(res.text)

    return res.text
}
const validarNumeroSerie = (numeroSerie) => {
    const patron = /\d/;
    return patron.test(numeroSerie);
}
let counter_intent = 0
const flowContactarHumano = addKeyword('Ayuda Humana', { sensitive: true }).addAnswer('contactando a lili')
const flowCancelacionPorInactividad = addKeyword(EVENTS.ACTION).addAnswer('Se canceló por inactividad contactando a lili...')
const flowProblemaResuelto = addKeyword('Si', { sensitive: true }).addAnswer('volver al inicio', {
    buttons: [
        {
            body: "INICIO"
        }
    ]
})
const flowProblemaNoResuelto = addKeyword(['No'], { sensitive: true }).addAnswer('veamos de nuevo, Cual es tu problema?', { capture: true },
    async (ctx, { flowDynamic }) => {
        await flowDynamic('Entiendo tu problema, dame un segundo!')
    }).addAction(async (ctx, { flowDynamic }) => {
        await flowDynamic(await sendMessageToChatGPT({ message: ctx.body }))
    }).addAnswer("resolvimos tu inconveniente? *Si* o *No*", {
        capture: true,
        buttons: [
            {
                body: "Si"
            },
            {
                body: "Ayuda Humana"
            }
        ],
        delay: 7000
    }, null, [flowProblemaResuelto, flowContactarHumano])
const flowSecundario = addKeyword(['soporte', 'suport', 'sop']).addAnswer('Cual es tu problema?',
    { capture: true },
    async (ctx, { flowDynamic }) => {
        await flowDynamic('Entiendo tu problema, dame un segundo!')
    }).addAction(async (ctx, { state, flowDynamic }) => {
        const serie = state.get('serie')
        await flowDynamic(await sendMessageToChatGPT({ serie: serie, message: ctx.body }))
    }).addAnswer("resolvimos tu inconveniente? *Si* o *No*", {
        capture: true,
        buttons: [
            {
                body: "Si"
            },
            {
                body: "No"
            }
        ],
        delay: 7000
    }, null, [flowProblemaResuelto, flowProblemaNoResuelto])

const flowSeguimiento = addKeyword(['Tengo un problema', 'Necesito ayuda', 'No funciona', 'Tengo problema', 'error', 'problema'])
    .addAnswer(['Entiendo que tienes un problema, necesito que me envies el numero de serie ya sea en una imagen 100% legible o escribela'],
        { capture: true, idle: 60000 }, async (ctx, { state, gotoFlow, fallBack }) => {
            if (counter_intent >= 3) {
                return gotoFlow(flowCancelacionPorInactividad)
            }
            if (ctx?.idleFallBack) {
                counter_intent++
                return fallBack()
            }
            if (ctx.type === 'image') {
                await state.update({ serie: await ImgDownloadReq(ctx) })
            }
            if (validarNumeroSerie(ctx.body) && !ctx.body.includes('_event_media_') && !ctx.ref) {
                await state.update({ serie: ctx.body })
            }
        }).addAnswer(['Escribe *Soporte* para que te pueda ayudar uno de nuestros tecnicos virtuales'],
            null,
            null
        )
const flowPrincipal = addKeyword(['hola', 'ole', 'alo', 'que tal', 'Tal', 'hola meny', 'INICIO'])
    .addAnswer(['🙌 Hola soy Meny', ' en que puedo ayudarte?'],
        { capture: true },
        null,
        [flowSeguimiento]
    )

const main = async () => {
    await initializeChat()
    const adapterDB = new MockAdapter()
    const adapterFlow = createFlow([flowPrincipal, flowSecundario])

    const adapterProvider = createProvider(MetaProvider, {
        jwtToken: process.env.WHATSAPP_API,
        numberId: '153108304550069',
        verifyToken: 'brayan1234',
        version: 'v16.0',
    })
    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })
}
main()
