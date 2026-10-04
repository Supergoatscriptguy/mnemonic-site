// the roadmap, one chapter per stage, in the order they were built. the home page
// lists them and each chapter links to its neighbours
export const chapters = [
  { slug: '0-toolchain', title: 'The toolchain', summary: 'NASM, the linker, a build script, and a hello world with no C runtime behind it.' },
  { slug: '1-foundations', title: 'Foundations', summary: 'Files, memory, printing floats, timers, random numbers, threads and a progress bar.' },
  { slug: '2-data', title: 'The data pipeline', summary: 'Reading Parquet files, with their snappy and zstd compression, to get the training text out.' },
  { slug: '3-tokenizer', title: 'The tokenizer', summary: 'Byte-level BPE, trained in assembly on a sample of the data and then run over all of it.' },
  { slug: '4-gpu', title: 'Talking to the GPU', summary: 'Calling the CUDA driver API from assembly and running the first PTX kernel.' },
  { slug: '5-transformer', title: 'A transformer in PTX', summary: 'The forward and backward passes, gradient checks, tensor core matmuls and flash attention.' },
  { slug: '6-pretraining', title: 'Pretraining', summary: 'Training the 126M and then the 304M model on FineWeb-Edu with one RTX 5070 Ti.' },
  { slug: '7-chat', title: 'Teaching it to chat', summary: 'Fine-tuning on smol-smoltalk, giving it an identity, and two bugs that made it look dumb.' },
  { slug: '8-inference', title: 'Quantization and the CPU', summary: 'int8 and int4 weights, AVX2 and VNNI matrix code, a KV cache and the console chat.' },
  { slug: '9-optimization', title: 'Making it faster', summary: 'A profiler, a thread pool that spins, a second CUDA stream and better int4 scales.' },
  { slug: '10-browser', title: 'In the browser', summary: 'The same engine written again in WebAssembly, which is what runs the demo above.' },
]
