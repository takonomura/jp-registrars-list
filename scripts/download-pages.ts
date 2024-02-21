#!/usr/bin/env -S deno run --allow-net=jprs.jp --allow-write=raw/

import { delay } from "https://deno.land/std@0.216.0/async/delay.ts";
import * as log from "https://deno.land/std@0.216.0/log/mod.ts";

const CONSONANTS = ['', 'k', 's', 't', 'n', 'h', 'm', 'y', 'r', 'w'];

for (let i = 0; i < CONSONANTS.length; i++) {
  if (i > 0) {
    await delay(1000 + Math.random()*2000);
  }

  const name = `meibo_list_${CONSONANTS[i]}a.html`;
  const url = `https://jprs.jp/registration/list/meibo/${name}`;
  const filename = `raw/${String(i+1).padStart(2, '0')}-${name}`;

  log.info(`Downloading ${url} -> ${filename}`);

  const response = await fetch(url);
  if (response.status != 200) {
    throw new Error(`Unexpected status ${response.status} ${response.statusText}: ${await response.text()}`);
  }
  if (response.body == null) {
    throw new Error('response.body is null');
  }

  const stripCRStream = new TransformStream<Uint8Array>({
    transform(chunk, controller) {
      controller.enqueue(chunk.filter(byte => byte !== 0x0D));
    }
  });

  using file = await Deno.open(filename, { write: true, create: true, truncate: true });
  await response.body.pipeThrough(stripCRStream).pipeTo(file.writable);
}
