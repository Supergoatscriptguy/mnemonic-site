// the roadmap, one chapter per stage. the home page lists them, chapters link to their neighbours
export const chapters = [
  { num: 0, slug: '0-toolchain', title: 'Toolchain', summary: 'NASM, the linker, a build script and hello world with no C runtime.' },
  { num: 1, slug: '1-foundations', title: 'Foundations', summary: 'Files, memory, printing floats, timers, random numbers, threads, a progress bar.' },
  { num: 2, slug: '2-data', title: 'The data pipeline', summary: 'Parquet, snappy and zstd decoded in assembly, and the text pulled out of them.' },
  { num: 3, slug: '3-tokenizer', title: 'The tokenizer', summary: 'Byte-level BPE, trained and run in assembly on billions of tokens.' },
  { num: 4, slug: '4-gpu', title: 'Talking to the GPU', summary: 'The CUDA driver API from assembly, and the first PTX kernel.' },
  { num: 5, slug: '5-transformer', title: 'A transformer in PTX', summary: 'Forward and backward passes, gradient checks, tensor cores and flash attention.' },
  { num: 6, slug: '6-pretraining', title: 'Pretraining', summary: '126M and then 304M parameters on FineWeb-Edu, on one RTX 5070 Ti.' },
  { num: 7, slug: '7-chat', title: 'Teaching it to chat', summary: 'smol-smoltalk, loss masking, an identity, and two bugs that looked like a dumb model.' },
  { num: 8, slug: '8-inference', title: 'Quantization and the CPU', summary: 'int8 and int4 weights, AVX2 and VNNI matvecs, a KV cache, a console chat.' },
  { num: 9, slug: '9-optimization', title: 'Making it faster', summary: 'A profiler, a spinning thread pool, a second CUDA stream, better int4.' },
  { num: 10, slug: '10-browser', title: 'In the browser', summary: 'The same engine again, in hand-written WebAssembly.' },
]
