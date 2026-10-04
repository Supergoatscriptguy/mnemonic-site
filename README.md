# mnemonic-site

The website for [Mnemonic](https://github.com/Supergoatscriptguy/Mnemonic), a chat model written in assembly. It
has one chapter for each stage of the project, and a demo on the home page that runs the model in your browser.

The model and everything that made it live in the main repo, all in assembly. This repo is only the website, built
with Astro and React.

## Running it

```
npm install
npm run dev
```

The demo needs the page to be cross-origin isolated, since its threads share memory. `astro dev` and `astro preview`
send the right headers (see `astro.config.mjs`), and so does Vercel (see `vercel.json`).

## The engine

`public/engine.wasm` is built in the main repo from `site/engine.wat`, a hand-written WebAssembly engine.
`public/engine.js` runs it in workers. `npm run sync-engine` copies a fresh build and the tokenizer over from a
checkout of the main repo next to this one.

The models are downloaded from [Hugging Face](https://huggingface.co/SuperGoatScriptGuy/Mnemonic) when someone
presses the button, not before.
