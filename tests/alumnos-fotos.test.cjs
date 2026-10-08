const { test } = require('node:test');
const assert = require('node:assert/strict');
const { repository, supabaseAdmin, alumno, ALUMNO_ID, servidor, buildOpenApiSpec } = require('./helpers/alumnos-fixture.cjs');
const { MAX_FILE_SIZE } = require('../dist/middlewares/upload.middleware');

const imagen = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1ZkAAAAASUVORK5CYII=', 'base64');
function formulario(bytes = imagen, tipo = 'image/png', campo = 'foto', nombre = 'avatar.png') {
  const form = new FormData();
  form.append(campo, new Blob([bytes], { type: tipo }), nombre);
  return form;
}

test('ruta de storage deriva la extensión del MIME permitido, no del nombre enviado', async (t) => {
  const uploads = [];
  t.mock.method(supabaseAdmin.storage, 'from', (bucket) => ({
    upload: async (path, bytes, options) => { uploads.push({ bucket, path, bytes, options }); return { error: null }; },
    getPublicUrl: (path) => ({ data: { publicUrl: `https://storage.example.invalid/${path}` } }),
  }));
  for (const [mimetype, extension] of [['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp']]) {
    const url = await repository.uploadProfilePhoto(ALUMNO_ID, { originalname: 'nombre-no-confiable.html', mimetype, buffer: imagen });
    assert.ok(url.endsWith(`/foto.${extension}`));
    assert.equal(uploads.at(-1).path, `${ALUMNO_ID}/foto.${extension}`);
    assert.equal(uploads.at(-1).bucket, 'avatares');
    assert.equal(uploads.at(-1).options.contentType, mimetype);
  }
  await assert.rejects(repository.uploadProfilePhoto(ALUMNO_ID, { mimetype: 'text/html', buffer: imagen }), { statusCode: 400 });
  assert.equal(uploads.length, 3);
});

test('eliminación cubre formatos actuales y fotos JPEG del formato anterior', async (t) => {
  let paths;
  t.mock.method(supabaseAdmin.storage, 'from', () => ({
    remove: async (files) => { paths = files; return { error: null }; },
  }));
  await repository.deleteProfilePhoto(ALUMNO_ID);
  assert.deepEqual(paths, ['jpg', 'jpeg', 'png', 'webp'].map((extension) => `${ALUMNO_ID}/foto.${extension}`));
});

test('HTTP: foto demasiado grande devuelve 413 sin escribir perfil ni storage', async (t) => {
  const upload = t.mock.method(repository, 'uploadProfilePhoto', async () => { throw Error('No debe subir'); });
  const update = t.mock.method(repository, 'updatePhoto', async () => { throw Error('No debe actualizar'); });
  const base = await servidor(t);
  const response = await fetch(`${base}/alumnos/me/perfil/foto`, { method: 'PUT',
    headers: { Authorization: 'Bearer alumno' }, body: formulario(Buffer.alloc(MAX_FILE_SIZE + 1)),
  });
  assert.equal(response.status, 413);
  assert.equal((await response.json()).error.code, 'PAYLOAD_TOO_LARGE');
  assert.equal(upload.mock.callCount(), 0);
  assert.equal(update.mock.callCount(), 0);
  assert.ok(buildOpenApiSpec().paths['/alumnos/me/perfil/foto'].put.responses['413']);
});

test('HTTP: formato inválido, campo incorrecto, archivo ausente y múltiples fotos devuelven 400', async (t) => {
  const upload = t.mock.method(repository, 'uploadProfilePhoto', async () => { throw Error('No debe subir'); });
  const base = await servidor(t);
  const multiple = formulario();
  multiple.append('foto', new Blob([imagen], { type: 'image/png' }), 'otra.png');
  for (const body of [formulario(imagen, 'text/plain'), formulario(imagen, 'image/png', 'archivo'), new FormData(), multiple]) {
    const response = await fetch(`${base}/alumnos/me/perfil/foto`, { method: 'PUT',
      headers: { Authorization: 'Bearer alumno' }, body,
    });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, 'BAD_REQUEST');
  }
  assert.equal(upload.mock.callCount(), 0);
});

test('HTTP: foto válida actualiza únicamente el alumno vinculado, sin aceptar IDs ajenos', async (t) => {
  t.mock.method(repository, 'findById', async () => ({ id: ALUMNO_ID }));
  const url = 'https://storage.example.invalid/avatar.png';
  const upload = t.mock.method(repository, 'uploadProfilePhoto', async () => url);
  const update = t.mock.method(repository, 'updatePhoto', async () => ({ id: ALUMNO_ID, foto_url: url }));
  const base = await servidor(t);
  const response = await fetch(`${base}/alumnos/me/perfil/foto?alumnoId=otro-alumno`, { method: 'PUT',
    headers: { Authorization: 'Bearer alumno' }, body: formulario(),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data: { fotoUrl: url } });
  assert.equal(upload.mock.calls[0].arguments[0], ALUMNO_ID);
  assert.equal(upload.mock.calls[0].arguments[1].mimetype, 'image/png');
  assert.deepEqual(update.mock.calls[0].arguments, [ALUMNO_ID, url]);
});

test('HTTP: foto requiere rol alumno y un perfil vinculado', async (t) => {
  const upload = t.mock.method(repository, 'uploadProfilePhoto', async () => { throw Error('No debe subir'); });
  const base = await servidor(t, { sinPerfil: { id: alumno.id, rol: 'ALU' }, profesor: { id: 'profesor', rol: 'PROF' } });
  for (const token of ['sinPerfil', 'profesor']) {
    const response = await fetch(`${base}/alumnos/me/perfil/foto`, { method: 'PUT',
      headers: { Authorization: `Bearer ${token}` }, body: formulario(),
    });
    assert.equal(response.status, 403);
  }
  assert.equal(upload.mock.callCount(), 0);
});

test('HTTP: eliminación quita foto del alumno vinculado y responde 204', async (t) => {
  t.mock.method(repository, 'findById', async () => ({ id: ALUMNO_ID }));
  const remove = t.mock.method(repository, 'deleteProfilePhoto', async () => {});
  const update = t.mock.method(repository, 'deletePhoto', async () => {});
  const base = await servidor(t);
  const response = await fetch(`${base}/alumnos/me/perfil/foto?alumnoId=otro`, { method: 'DELETE', headers: { Authorization: 'Bearer alumno' } });
  assert.equal(response.status, 204);
  assert.equal(await response.text(), '');
  assert.deepEqual(remove.mock.calls[0].arguments, [ALUMNO_ID]);
  assert.deepEqual(update.mock.calls[0].arguments, [ALUMNO_ID]);
});

test('HTTP: un fallo de storage no actualiza foto_url ni expone detalles internos', async (t) => {
  t.mock.method(console, 'error', () => {});
  t.mock.method(repository, 'findById', async () => ({ id: ALUMNO_ID }));
  t.mock.method(repository, 'uploadProfilePhoto', async () => { throw Error('Detalle privado de storage'); });
  const update = t.mock.method(repository, 'updatePhoto', async () => {});
  const base = await servidor(t);
  const response = await fetch(`${base}/alumnos/me/perfil/foto`, { method: 'PUT', headers: { Authorization: 'Bearer alumno' }, body: formulario() });
  assert.equal(response.status, 500);
  assert.equal((await response.json()).error.message, 'Error interno del servidor');
  assert.equal(update.mock.callCount(), 0);
});
