const { createBot, createProvider, createFlow, addKeyword, ProviderClass } = require('@bot-whatsapp/bot')
const axios = require('axios')
const MetaProvider = require('@bot-whatsapp/provider/meta')
const MockAdapter = require('@bot-whatsapp/database/mock')
const { EVENTS } = require('@bot-whatsapp/bot/lib/bundle.bot.cjs')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

const openIAReq = async (ctx) => {
    console.log(ctx.serie)
    let openia_data = JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
            {
                role: "system",
                content: "Tu eres un asistente muy util",
            },
            {
                role: "user",
                content: ctx.serie ? `que tal soy un usuario que te va a entregar un numero de serie que es ${ctx.serie} para la siguiente pregunta, quiero que ignores todo esto menos el numero de serie la pregunta es la siguiente : ${ctx.message}. Ahora quiero que en la respuesta puedas integrar el numero de serie como por ej: Lo siento por el inconveniente con tu impresora con el numero de serie ${ctx.serie}.  Aquí hay algunos pasos que puedes seguir para resolver el atasco de papel: 1. Apaga y desenchufa la impresora. 
                2. Abre la cubierta de acceso a los cartuchos de tinta o tóner y retira cualquier papel que puedas ver.
                3. Si el .....`: `que tal soy un usuario que te va a entregar una pregunta que hara un usuario para el soporte de una impresora requiero que ignores esto esta es la pregunta: ${ctx.body}`,
            },
        ],
    });
    let config = {
        maxBodyLength: Infinity,
        headers: {
            "Content-Type": "application/json",
            Authorization:
                `Bearer ${process.env.OPENIA_KEY}`,
        }
    }
    const { data } = await axios.post("https://api.openai.com/v1/chat/completions", openia_data, config)
    return data.choices[0].message.content
}

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


    return response.data.responses[0].textAnnotations[0].description
}
const validarNumeroSerie = (numeroSerie) => {
    const patron = /\d/;
    return patron.test(numeroSerie);
}
let counter_intent = 0

const flowFinal = addKeyword(EVENTS.ACTION).addAnswer('Se canceló por inactividad contactando a lili...')
const flowSecundario = addKeyword(['soporte', 'suport', 'sop']).addAnswer('Cual es tu problema', { capture: true},
    async (ctx, { state, flowDynamic }) => {
        console.log(ctx)
            const serie = state.get('serie')
            await flowDynamic(await openIAReq({ message: ctx.body, serie: serie }))
    }).addAnswer(['espero haber resuelto tu problema'])

const flowSeguimiento = addKeyword(['Tengo un problema', 'Necesito ayuda', 'No funciona', 'Tengo problema', 'error', 'problema'])
    .addAnswer(['Entiendo tu problema, necesito que me envies el numero de serie ya sea en una imagen 100% legible o escribela'],
        { capture: true, idle: 60000 }, async (ctx, { state, gotoFlow, fallBack }) => {
            console.log('desde aqui')
            if (counter_intent >= 3) {
                return gotoFlow(flowFinal)
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
            null,
            [flowSecundario]
        )
const flowPrincipal = addKeyword(['hola', 'ole', 'alo', 'que tal', 'Tal', 'hola meny'])
    .addAnswer(['🙌 Hola soy Meny', ' en que puedo ayudarte?'],
        { capture: true },
        null,
        [flowSeguimiento]
    )

const main = async () => {
    const adapterDB = new MockAdapter()
    const adapterFlow = createFlow([flowPrincipal])

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
