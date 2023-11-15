const { createBot, createProvider, createFlow, addKeyword } = require('@bot-whatsapp/bot')
const axios = require('axios')

const MetaProvider = require('@bot-whatsapp/provider/meta')
const MockAdapter = require('@bot-whatsapp/database/mock')
const fs = require('fs')
const path = require('path')
const { text } = require('body-parser')



const openIAReq = async (ctx) => {
    let openia_data = JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
            {
                role: "system",
                content: "Tu eres un asistente muy util",
            },
            {
                role: "user",
                content: `${ctx.message} si de algo ayuda la serie de el equipo es ${ctx.serie}`,
            },
        ],
    });
    let config = {
        maxBodyLength: Infinity,
        headers: {
            "Content-Type": "application/json",
            Authorization:
                "Bearer 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",
        }
    }
    const { data } = await axios.post("https://api.openai.com/v1/chat/completions", openia_data, config)
    return data.choices[0].message.content
}


const ImgDownloadReq = async (ctx) => {
    let text
    let config = {
        method: 'get',
        responseType: 'arraybuffer',
        maxBodyLength: Infinity,
        url: ctx.url,
        headers: {
            'Authorization': 'Bearer EAAE3qQezrZAEBOZB7nj7chZBZB1De7VxZCAfhD54nF36CzcduNFdxiIoGHI4mxzkt2DKKVSpcSN1qbiStKy5h2EhGVVoaBzWekyKcEsnYKjXmuduQF3KTNvvllLTgLZC8zQizJHA5UZAmY0pZAvwuaXNHb3TpW2qU3SFPeNG7dxlDNcC5HlIZBcPBSZCSN0jjC5OH6QZCRPYaNl0NXvWTORfIQ5ZBgZDZD'
        }
    }
    const rutaArchivo = `./public/img/imagen_${ctx.from}.jpg`
    axios.request(config)
        .then(async (response) => {
            const res = await response.data
            const rutaCompleta = path.join(__dirname, rutaArchivo)
            fs.writeFileSync(rutaCompleta, Buffer.from(res))

            const imageBuffer = fs.readFileSync(rutaArchivo)
            const base64Image = imageBuffer.toString('base64')
            let data = {
                requests: [
                    {
                        image: {
                            content: base64Image,
                        },
                        features: [
                            {
                                type: 'DOCUMENT_TEXT_DETECTION',
                                maxResults: 5,
                            },
                        ],
                    },
                ],
            }
            let config = {
                method: 'post',
                maxBodyLength: Infinity,
                url: 'https://vision.googleapis.com/v1/images:annotate?key=AIzaSyAIY8r0spnajlQBhM8K2QTUKDysoICkEJo',
                headers: {
                    'Content-Type': 'application/json'
                },
                data: data
            }

            const resText = await axios.request(config)
           return text = await resText.data.responses[0].textAnnotations[0].description
        })
        return text
}


const flowSeguimiento = addKeyword(['Tengo un problema', 'Necesito ayuda', 'No funciona', 'Tengo problema', 'error', 'problema'])
    .addAnswer(['Entiendo tu problema, necesito que me envies el numero de serie ya sea en una imagen 100% legible o escribela'],
        { capture: true }, async (ctx, { state }) => {
            console.log(ctx)
            if (ctx.type === 'image') {
                console.log(await ImgDownloadReq(ctx))
            } else if (ctx.type === 'text') {
                await state.update({ serie: ctx.body })
            }
        }).addAnswer(['Escribe *Soporte* para que te pueda aydar uno de nuestros tecnicos virtuales'],
            null,
            null,
            // [flowSecundario]
        )
const flowPrincipal = addKeyword(['hola', 'ole', 'alo', 'que tal', 'Tal', 'hola meny'])
    .addAnswer(['🙌 Hola soy Meny', ' en que puedo ayudarte?'],
        null,
        null,
        [flowSeguimiento]
    )

const main = async () => {
    const adapterDB = new MockAdapter()
    const adapterFlow = createFlow([flowPrincipal])

    const adapterProvider = createProvider(MetaProvider, {
        jwtToken: 'EAAE3qQezrZAEBOZB7nj7chZBZB1De7VxZCAfhD54nF36CzcduNFdxiIoGHI4mxzkt2DKKVSpcSN1qbiStKy5h2EhGVVoaBzWekyKcEsnYKjXmuduQF3KTNvvllLTgLZC8zQizJHA5UZAmY0pZAvwuaXNHb3TpW2qU3SFPeNG7dxlDNcC5HlIZBcPBSZCSN0jjC5OH6QZCRPYaNl0NXvWTORfIQ5ZBgZDZD',
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
