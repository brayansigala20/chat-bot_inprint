const { CoreClass } = require("@bot-whatsapp/bot");

class ChatGptClass extends CoreClass {
    queue = []
    optionsGPT = { model: 'gpt-3.5-turbo' }
    openai = undefined
    constructor(_database, _provider) {
        super(null, _database, _provider)
        this.init().then()
    }
    init = async () => {
        const { ChatGPTAPI } = await import("chatgpt")
        this.openai = new ChatGPTAPI({
            apiKey: process.env.OPENIA_KEY
        })
    }
    handleMsg = async () => {
        const { from, body } = ctx

        const completion = await this.openai.sendMessage(body, {
            conversatioId: !this.queue.length
                ? undefined
                : this.queue[this.queue.length - 1].conversatioId,
            parentMessageId: !this.queue.length
                ? undefined
                : this.queue[this.queue.length - 1].id
        })
        this.queue.push(completion)
        const parseMessage = {
            ...completion,
            answer: completion.text
        }
        this.sendFlowSimple([parseMessage], from)
    }
}
module.exports = ChatGptClass