#!/usr/bin/env -S deno run --allow-read=raw/ --allow-write=registrars.json

import { DOMParser, HTMLDocument, Node, Element } from "https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts";
import * as log from "https://deno.land/std@0.216.0/log/mod.ts";

const isElement = (n: Node): n is Element => n instanceof Element;

interface Registrar {
    companyName: string;
    serviceName: string;
    serviceURL: string | null;
    domains: {
        generalUse: boolean; // 汎用JPドメイン名
        prefectureType: boolean; // 都道府県型JPドメイン名
        japanesePrefectureType: boolean; // 日本語の都道府県型JPドメイン名
        japanese: boolean; // 日本語JPドメイン名
        organizational: { // 属性型JPドメイン名
            ac: boolean;
            ad: boolean;
            co: boolean;
            ed: boolean;
            go: boolean;
            gr: boolean;
            ne: boolean;
            or: boolean;
        };
        organizationalPreRegistration: { // 属性型JPドメイン名の組織設立前登録
            ac: boolean;
            ad: boolean;
            co: boolean;
            ed: boolean;
            go: boolean;
            gr: boolean;
            ne: boolean;
            or: boolean;
        };
        geographical: boolean;
    };
    services: {
      registration: boolean;
      hosting: boolean;
    };
    ipv6: {
      configurable: boolean;
      provided: boolean;
    };
    dnssec: {
      configurable: boolean;
      authoritativeServer: boolean;
      cacheServer: boolean;
    };
};

function parsePage(document: HTMLDocument): Registrar[] {
  const rows = Array.from(document.querySelectorAll('table.tb-sml > tbody')).filter(isElement)
    .map(e => Array.from(e.children)).flat()
    .filter(e => e.nodeName == 'TR');
  return rows.map(row => {
    const columns = Array.from(row.children);
    if (columns.length != 20) {
      throw new Error(`unexpected columns count: ${columns.length}`);
    }
    const unexpectedNodes = columns.map(e => e.nodeName).filter(name => name != 'TD');
    if (unexpectedNodes.length > 0) {
      throw new Error(`unexpected elements in a row: ${unexpectedNodes.join(', ')}`);
    }
    const { companyName, serviceName, serviceURL } = parseFirstColumn(columns.shift()!);
    return {
      companyName,
      serviceName,
      serviceURL,
      ...parseColumns(columns),
    };
  });
}

function parseFirstColumn(td: Element) {
  let companyName = '';
  let serviceName = '';
  let serviceURL = null;
  let breaked = false;
  for (const e of td.childNodes) {
    if (e.nodeName == 'BR') {
      breaked = true;
      continue;
    }
    if (!breaked) {
      companyName += e.textContent;
    } else {
      serviceName += e.textContent;
      if (isElement(e)) {
        const href = e.getAttribute('href');
        if (href) {
          serviceURL = href;
        }
      }
    }
  }
  return {
    companyName: companyName.trim(),
    serviceName: serviceName.replace(/^\((.+)\)$/, '$1').trim(),
    serviceURL,
  };
}

const AVAILABLE_SYMBOL = '○';
const UNAVAILABLE_SYMBOL = '';
const PRE_SYMBOL = '◎'; // 組織設立前に属性型JPドメイン名を登録可能
const JAPANESE_SYMBOL = '◆'; // 日本語の都道府県名で登録可能

function parseColumns(columns: Element[]) {
  if (columns.length != 19) {
    throw new Error(`unexpected columns count: ${columns.length}`);
  }

  const v = columns.map(e => e.textContent.trim());
  for (let i = 0; i < v.length; i++) {
    const s = v[i];
    if (s == AVAILABLE_SYMBOL || s == UNAVAILABLE_SYMBOL) {
      continue;
    }
    if (s == PRE_SYMBOL && i >= 3 && i <= 10) {
      continue;
    }
    if (s == JAPANESE_SYMBOL && i == 1) {
      continue;
    }
    throw new Error(`unexpected symbol ${JSON.stringify(s)} in column #${i}`);
  }

  return {
    domains: {
      generalUse: v[0] == AVAILABLE_SYMBOL,
      prefectureType: v[1] == AVAILABLE_SYMBOL || v[1] == JAPANESE_SYMBOL,
      japanesePrefectureType: v[1] == JAPANESE_SYMBOL,
      japanese: v[2] == AVAILABLE_SYMBOL,
      organizational: {
        ac: v[3]  == AVAILABLE_SYMBOL || v[3]  == PRE_SYMBOL,
        ad: v[4]  == AVAILABLE_SYMBOL || v[4]  == PRE_SYMBOL,
        co: v[5]  == AVAILABLE_SYMBOL || v[5]  == PRE_SYMBOL,
        ed: v[6]  == AVAILABLE_SYMBOL || v[6]  == PRE_SYMBOL,
        go: v[7]  == AVAILABLE_SYMBOL || v[7]  == PRE_SYMBOL,
        gr: v[8]  == AVAILABLE_SYMBOL || v[8]  == PRE_SYMBOL,
        ne: v[9]  == AVAILABLE_SYMBOL || v[9]  == PRE_SYMBOL,
        or: v[10] == AVAILABLE_SYMBOL || v[10] == PRE_SYMBOL,
      },
      organizationalPreRegistration: {
        ac: v[3]  == PRE_SYMBOL,
        ad: v[4]  == PRE_SYMBOL,
        co: v[5]  == PRE_SYMBOL,
        ed: v[6]  == PRE_SYMBOL,
        go: v[7]  == PRE_SYMBOL,
        gr: v[8]  == PRE_SYMBOL,
        ne: v[9]  == PRE_SYMBOL,
        or: v[10] == PRE_SYMBOL,
      },
      geographical: v[11] == AVAILABLE_SYMBOL, 
    },
    services: {
      registration: v[12] == AVAILABLE_SYMBOL,
      hosting: v[13] == AVAILABLE_SYMBOL,
    },
    ipv6: {
      configurable: v[14] == AVAILABLE_SYMBOL,
      provided: v[15] == AVAILABLE_SYMBOL,
    },
    dnssec: {
      configurable: v[16] == AVAILABLE_SYMBOL,
      authoritativeServer: v[17] == AVAILABLE_SYMBOL,
      cacheServer: v[18] == AVAILABLE_SYMBOL,
    },
  };
}

function sortRegistrars(registrars: Registrar[]) {
  const companyNames = registrars.map(v => v.companyName);
  const toSortKeys = (v: Registrar) => [
    companyNames.indexOf(v.companyName),
    v.serviceName,
    v.serviceURL,

    v.domains.generalUse,
    v.domains.prefectureType,
    v.domains.japanesePrefectureType,
    v.domains.japanese,
    v.domains.geographical,

    v.services.registration,
    v.services.hosting,
    v.ipv6.configurable,
    v.ipv6.provided,
    v.dnssec.configurable,
    v.dnssec.authoritativeServer,
    v.dnssec.cacheServer,

    v.domains.organizational.ac,
    v.domains.organizational.ad,
    v.domains.organizational.co,
    v.domains.organizational.ed,
    v.domains.organizational.go,
    v.domains.organizational.gr,
    v.domains.organizational.ne,
    v.domains.organizational.or,

    v.domains.organizationalPreRegistration.ac,
    v.domains.organizationalPreRegistration.ad,
    v.domains.organizationalPreRegistration.co,
    v.domains.organizationalPreRegistration.ed,
    v.domains.organizationalPreRegistration.go,
    v.domains.organizationalPreRegistration.gr,
    v.domains.organizationalPreRegistration.ne,
    v.domains.organizationalPreRegistration.or,
  ];
  registrars.sort((a, b) => {
    const aKeys = toSortKeys(a);
    const bKeys = toSortKeys(b);

    for (let i = 0; i < aKeys.length; i++) {
      const aKey = aKeys[i];
      const bKey = bKeys[i];

      if (aKey! < bKey!) {
        return -1;
      }
      if (aKey! > bKey!) {
        return 1;
      }
    }
    return 0;
  });
}

const CONSONANTS = ['', 'k', 's', 't', 'n', 'h', 'm', 'y', 'r', 'w'];

const parser = new DOMParser();
const result = [];
for (let i = 0; i < CONSONANTS.length; i++) {
  const filename = `raw/${String(i+1).padStart(2, '0')}-meibo_list_${CONSONANTS[i]}a.html`;

  log.info(`Parsing ${filename}`);

  const html = await Deno.readTextFile(filename);

  const document = parser.parseFromString(html, 'text/html');
  if (!document) {
    throw new Error('no document found');
  }

  result.push(...parsePage(document));
}

sortRegistrars(result);

await Deno.writeTextFile('registrars.json', JSON.stringify(result, null, 2)+'\n');
