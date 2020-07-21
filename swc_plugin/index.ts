import { prepare } from "../deps.ts";
import { ParseOptions, AnalyzeOptions } from "../types/options.ts";

const filenameBase = "deno_swc";

const PLUGIN_URL_BASE =
  "https://api.github.com/repos/nestdotland/deno_swc/releases";

const isDev = Deno.env.get("DEV");

export const initPlugin = async (
  { importMetaUrl }: { importMetaUrl: string },
) => {
  if (isDev) {
    const { filenamePrefix, filenameSuffix } = (() => {
      switch (Deno.build.os) {
        case "darwin": {
          return { filenamePrefix: "lib", filenameSuffix: ".dylib" };
        }
        case "linux": {
          return { filenamePrefix: "lib", filenameSuffix: ".so" };
        }
        case "windows": {
          return { filenamePrefix: "", filenameSuffix: ".dll" };
        }
      }
    })();

    const filename =
      `./target/debug/${filenamePrefix}${filenameBase}${filenameSuffix}`;

    // This will be checked against open resources after Plugin.close()
    // in runTestClose() below.
    const resourcesPre = Deno.resources();

    const rid = Deno.openPlugin(filename);
  } else {
    const tagName = (() => {
      const version = importMetaUrl.match(/v\d[.]\d[.]\d/gi);
      if (!version) {
        throw new Error(`Please specify a version when importing DenoSWC.`);
      } else {
        return version[0];
      }
    })();
    throw new Error(`
      TODO:
      (1) Validate that the release tag is an existing tag
      (2) Retrieve corresponding asset URL based on releaseTag
    `);
    const releaseId = "unknown";
    const pluginId = await prepare({
      name: "deno_swc",
      printLog: true,
      checkCache: Boolean(Deno.env.get("CACHE")) || true,
      urls: {
        darwin: `${PLUGIN_URL_BASE}/${releaseId}/lib${filenameBase}.dylib`,
        windows: `${PLUGIN_URL_BASE}/${releaseId}/${filenameBase}.dll`,
        linux: `${PLUGIN_URL_BASE}/${releaseId}/lib${filenameBase}.so`,
      },
    });
  }

  // @ts-ignore
  const core = Deno.core as {
    ops: () => { [key: string]: number };
    setAsyncHandler(rid: number, handler: (response: Uint8Array) => void): void;
    dispatch(
      rid: number,
      msg: any,
      buf?: ArrayBufferView,
    ): Uint8Array | undefined;
  };

  const {
    parse,
    extract_dependencies,
    print,
  } = core.ops();

  const textDecoder = new TextDecoder();
  const textEncoder = new TextEncoder();

  return {
    swc_print: (opt: object) => {
      const response = core.dispatch(
        print,
        textEncoder.encode(JSON.stringify(opt)),
      );
      return JSON.parse(textDecoder.decode(response));
    },

    swc_parse_ts: (opt: ParseOptions) => {
      const response = core.dispatch(
        parse,
        textEncoder.encode(JSON.stringify(opt)),
      );
      return JSON.parse(textDecoder.decode(response));
    },

    swc_extract_dependencies: (opt: AnalyzeOptions) => {
      const response = core.dispatch(
        extract_dependencies,
        textEncoder.encode(JSON.stringify(opt)),
      );
      return JSON.parse(textDecoder.decode(response));
    },
  };
};
