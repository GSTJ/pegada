const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { createRequire } = require("node:module");

// Resolve through the real consumers, so a nested vulnerable copy cannot hide
// behind an unrelated hoisted version.
const expoRequire = createRequire(
  require.resolve("@expo/code-signing-certificates"),
);
const awsRequire = createRequire(require.resolve("@aws-sdk/xml-builder"));
const forge = expoRequire("node-forge");
const { XMLParser } = awsRequire("fast-xml-parser");

const probes = {
  "Ed25519 small-order key": () => {
    const publicKey = Buffer.alloc(32);
    publicKey[0] = 1;
    const signature = Buffer.alloc(64);
    signature[0] = 1;
    assert.equal(
      forge.ed25519.verify({
        message: "admin=true",
        encoding: "utf8",
        publicKey,
        signature,
      }),
      false,
    );
    const keys = forge.ed25519.generateKeyPair();
    const message = Buffer.from("Pegada signed manifest");
    const valid = forge.ed25519.sign({ message, privateKey: keys.privateKey });
    assert.equal(
      forge.ed25519.verify({
        message,
        signature: valid,
        publicKey: keys.publicKey,
      }),
      true,
    );
  },
  "TLS record without session": () => {
    for (const state of ["fresh", "closed", "close_notify"]) {
      const client = forge.tls.createConnection({
        server: false,
        tlsDataReady() {},
        closed() {},
        error() {},
      });
      if (state !== "fresh") client.handshake();
      if (state === "closed") client.close();
      if (state === "close_notify")
        client.process(forge.util.hexToBytes("15030100020100"));
      assert.doesNotThrow(
        () => client.process(forge.util.hexToBytes("160301000402000000")),
        state,
      );
    }
  },
  "TLS unsupported compression": () => {
    const errors = [];
    const client = forge.tls.createConnection({
      server: false,
      tlsDataReady() {},
      closed() {},
      error: (_, e) => errors.push(e),
    });
    client.handshake();
    const hello = forge.util.hexToBytes(`0303${"00".repeat(32)}00002fff`);
    const handshake = `${forge.util.hexToBytes("020000")}${String.fromCodePoint(hello.length)}${hello}`;
    const record = `${forge.util.hexToBytes("16030300")}${String.fromCodePoint(handshake.length)}${handshake}`;
    assert.doesNotThrow(() => client.process(record));
    assert.equal(
      errors.some((e) => /compression/i.test(e.message)),
      true,
      "must reject the unoffered method immediately",
    );
  },
  "HTTP whitespace header and cookie": () => {
    const http = expoRequire("node-forge/lib/http");
    const response = http.createResponse();
    const value = `a${"\t ".repeat(40000)}X`;
    response.readHeader(
      forge.util.createBuffer(
        `HTTP/1.1 200 OK\r\nX-A: ${value}\r\nSet-Cookie: dog=${
          value
        }; Path=/\r\n\r\n`,
      ),
    );
    assert.equal(response.getField("X-A"), value);
    assert.equal(response.getCookies()[0].value, value);
  },
  "XML unterminated stop node": () => {
    const parser = new XMLParser({ stopNodes: ["stop"] });
    assert.throws(() => parser.parse(`<stop>${"<a ".repeat(90000)}`));
    assert.deepEqual(parser.parse("<stop><a>dog</a></stop>"), {
      stop: "<a>dog</a>",
    });
  },
  "Expo manifest signing and AWS XML": () => {
    const expo = require("@expo/code-signing-certificates");
    const keys = expo.generateKeyPair();
    const cert = expo.generateSelfSignedCodeSigningCertificate({
      keyPair: keys,
      validityNotBefore: new Date(Date.now() - 60000),
      validityNotAfter: new Date(Date.now() + 3600000),
      commonName: "Pegada local security probe",
    });
    expo.validateSelfSignedCertificate(cert, keys);
    const pem = expo.convertCertificateToCertificatePEM(cert);
    const restored = expo.convertCertificatePEMToCertificate(pem);
    const manifest = Buffer.from(
      '{"id":"pegada-local-probe","runtimeVersion":"security-test"}',
    );
    const signature = expo.signBufferRSASHA256AndVerify(
      keys.privateKey,
      restored,
      manifest,
    );
    assert.equal(
      require("node:crypto").verify(
        "sha256",
        manifest,
        expo.convertKeyPairToPEM(keys).publicKeyPEM,
        Buffer.from(signature, "base64"),
      ),
      true,
    );
    const { parseXML } = require("@aws-sdk/xml-builder");
    assert.deepEqual(
      parseXML(
        "<ListBucketResult><Name>pegada</Name><Contents><Key>dog&amp;photo.jpg</Key></Contents></ListBucketResult>",
      ),
      {
        ListBucketResult: {
          Name: "pegada",
          Contents: { Key: "dog&photo.jpg" },
        },
      },
    );
  },
};

if (process.argv[2]) {
  probes[process.argv[2]]();
} else {
  let failed = false;
  for (const name of Object.keys(probes)) {
    const result = spawnSync(process.execPath, [__filename, name], {
      timeout: name === "Expo manifest signing and AWS XML" ? 10000 : 2000,
      encoding: "utf8",
    });
    if (result.status === 0) {
      console.log(`PASS ${name}`);
    } else {
      failed = true;
      console.error(
        `FAIL ${name}: ${result.error?.code || result.stderr.trim()}`,
      );
    }
  }
  process.exitCode = failed ? 1 : 0;
}
