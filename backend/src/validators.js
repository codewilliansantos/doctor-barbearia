/**
 * Helpers de validação para entrada de dados.
 *
 * Uso típico:
 *   router.post('/foo', validar([
 *     campo('nome').presente().texto({ min: 1, max: 100 }),
 *     campo('email').presente().email(),
 *     campo('idade').opcional().inteiro({ min: 0, max: 150 }),
 *   ]), handler);
 *
 *   if (req.tenantId) ... // sempre disponível após o middleware de tenant
 *
 * Toda validação falha → responde 400 com { ok: false, erro, campos: [...] }
 */
const LIMITES = {
  NOME:        { min: 1,  max: 120 },
  EMAIL:       { min: 5,  max: 150 },
  WHATSAPP:    { min: 10, max: 13 },  // só dígitos
  SENHA:       { min: 6,  max: 100 },
  DESCRICAO:   { min: 0,  max: 1000 },
  OBSERVACAO:  { min: 0,  max: 500 },
  PRECO:       { min: 0,  max: 999999.99 },
  QUANTIDADE:  { min: 0,  max: 99999 },
  PORCENTAGEM: { min: 0,  max: 100 },
  ID:          { min: 1,  max: 999999999 },
};

const PATTERNS = {
  email:     /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  // WhatsApp BR ou internacional: só dígitos, 10-13 chars
  whatsapp:  /^\d{10,13}$/,
  // UUID básico
  uuid:      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  // Slug seguro (subdomínio): letras, números e hífen
  slug:      /^[a-z0-9-]{1,60}$/,
  // ISO date (YYYY-MM-DD)
  date:      /^\d{4}-\d{2}-\d{2}$/,
  // ISO datetime
  datetime:  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
  // Hora HH:MM
  time:      /^([01]\d|2[0-3]):[0-5]\d$/,
};

/**
 * Sanitiza string: remove tags HTML/JS perigosas, colapsa espaços.
 * Não substitui escape de output (React já faz), mas remove ataques óbvios.
 */
function sanitizarString(s) {
  if (typeof s !== 'string') return s;
  return s
    .replace(/<[^>]*>/g, '')          // remove tags HTML
    .replace(/javascript:/gi, '')     // remove javascript: URLs
    .replace(/on\w+\s*=/gi, '')       // remove event handlers
    .replace(/[\u0000-\u001f\u007f]/g, '') // remove control chars
    .trim();
}

/**
 * Validador de campo fluente.
 *
 *   campo('nome')      → começa a definir o campo "nome"
 *     .presente()      → obrigatório
 *     .texto({...})    → tipo string com min/max
 *     .email()         → formato email
 *     .whatsapp()      → só dígitos 10-13
 *     .inteiro({...})  → número inteiro
 *     .numero({...})   → número (float)
 *     .enum(['a','b']) → valor na lista
 *     .data()          → formato YYYY-MM-DD
 *     .datetime()      → formato ISO
 *     .hora()          → formato HH:MM
 *     .slug()          → formato slug
 *     .uuid()          → formato UUID
 *     .array({...})    → array de itens
 *     .opcional()      → pula se undefined/null/''
 *     .custom(fn)      → validador customizado
 */
class ValidadorCampo {
  constructor(nome) {
    this.nome = nome;
    this.obrigatorio = false;
    this.tipo = null;
    this.opcoes = {};
    this.erros = [];
    this.ultimaValidacao = null;
  }

  presente()       { this.obrigatorio = true; return this; }
  opcional()       { this.obrigatorio = false; return this; }

  texto(opcoes = {}) {
    this.tipo = 'texto';
    this.opcoes = { min: 0, max: 1000, ...opcoes };
    return this;
  }

  email()    { this.tipo = 'email';    this.opcoes = LIMITES.EMAIL;    return this; }
  whatsapp() { this.tipo = 'whatsapp'; this.opcoes = LIMITES.WHATSAPP; return this; }
  senha()    { this.tipo = 'senha';    this.opcoes = LIMITES.SENHA;    return this; }

  inteiro(opcoes = {}) {
    this.tipo = 'inteiro';
    this.opcoes = { min: -Infinity, max: Infinity, ...opcoes };
    return this;
  }

  numero(opcoes = {}) {
    this.tipo = 'numero';
    this.opcoes = { min: -Infinity, max: Infinity, ...opcoes };
    return this;
  }

  enum(valores) {
    this.tipo = 'enum';
    this.opcoes = { valores };
    return this;
  }

  data()    { this.tipo = 'data';    return this; }
  datetime(){ this.tipo = 'datetime';return this; }
  hora()    { this.tipo = 'hora';    return this; }
  slug()    { this.tipo = 'slug';    this.opcoes = LIMITES.ID; return this; }
  uuid()    { this.tipo = 'uuid';    return this; }
  booleano(){ this.tipo = 'booleano';return this; }

  array(opcoes = {}) {
    this.tipo = 'array';
    this.opcoes = { min: 0, max: 100, ...opcoes };
    return this;
  }

  custom(fn) {
    this.tipo = 'custom';
    this.opcoes = { fn };
    return this;
  }

  _validar(value) {
    if (value === undefined || value === null || value === '') {
      if (this.obrigatorio) return `Campo "${this.nome}" é obrigatório.`;
      return null;
    }

    switch (this.tipo) {
      case 'texto': {
        if (typeof value !== 'string') return `Campo "${this.nome}" deve ser texto.`;
        const len = value.length;
        if (len < this.opcoes.min) return `Campo "${this.nome}" deve ter no mínimo ${this.opcoes.min} caracteres.`;
        if (len > this.opcoes.max) return `Campo "${this.nome}" deve ter no máximo ${this.opcoes.max} caracteres.`;
        return null;
      }
      case 'email': {
        if (typeof value !== 'string') return `Campo "${this.nome}" deve ser texto.`;
        if (!PATTERNS.email.test(value)) return `Campo "${this.nome}" deve ser um e-mail válido.`;
        if (value.length < this.opcoes.min || value.length > this.opcoes.max) return `Campo "${this.nome}" tem tamanho inválido.`;
        return null;
      }
      case 'whatsapp': {
        const digitos = String(value).replace(/\D/g, '');
        if (digitos.length < 10 || digitos.length > 13) return `Campo "${this.nome}" deve ter entre 10 e 13 dígitos.`;
        if (!PATTERNS.whatsapp.test(digitos)) return `Campo "${this.nome}" contém caracteres inválidos.`;
        return null;
      }
      case 'senha': {
        if (typeof value !== 'string') return `Campo "${this.nome}" deve ser texto.`;
        if (value.length < this.opcoes.min) return `Senha deve ter no mínimo ${this.opcoes.min} caracteres.`;
        if (value.length > this.opcoes.max) return `Senha muito longa.`;
        return null;
      }
      case 'inteiro': {
        const n = Number(value);
        if (!Number.isFinite(n) || !Number.isInteger(n)) return `Campo "${this.nome}" deve ser inteiro.`;
        if (n < this.opcoes.min) return `Campo "${this.nome}" deve ser ≥ ${this.opcoes.min}.`;
        if (n > this.opcoes.max) return `Campo "${this.nome}" deve ser ≤ ${this.opcoes.max}.`;
        return null;
      }
      case 'numero': {
        const n = Number(value);
        if (!Number.isFinite(n)) return `Campo "${this.nome}" deve ser numérico.`;
        if (n < this.opcoes.min) return `Campo "${this.nome}" deve ser ≥ ${this.opcoes.min}.`;
        if (n > this.opcoes.max) return `Campo "${this.nome}" deve ser ≤ ${this.opcoes.max}.`;
        return null;
      }
      case 'enum': {
        if (!this.opcoes.valores.includes(value)) return `Campo "${this.nome}" deve ser um de: ${this.opcoes.valores.join(', ')}.`;
        return null;
      }
      case 'data': {
        if (typeof value !== 'string' || !PATTERNS.date.test(value)) return `Campo "${this.nome}" deve ser YYYY-MM-DD.`;
        const d = new Date(value + 'T00:00:00');
        if (isNaN(d.getTime())) return `Campo "${this.nome}" é uma data inválida.`;
        return null;
      }
      case 'datetime': {
        if (typeof value !== 'string' || !PATTERNS.datetime.test(value)) return `Campo "${this.nome}" deve ser ISO 8601.`;
        const d = new Date(value);
        if (isNaN(d.getTime())) return `Campo "${this.nome}" é uma data/hora inválida.`;
        return null;
      }
      case 'hora': {
        if (typeof value !== 'string' || !PATTERNS.time.test(value)) return `Campo "${this.nome}" deve ser HH:MM.`;
        return null;
      }
      case 'slug': {
        if (typeof value !== 'string' || !PATTERNS.slug.test(value)) return `Campo "${this.nome}" tem formato de slug inválido.`;
        return null;
      }
      case 'uuid': {
        if (typeof value !== 'string' || !PATTERNS.uuid.test(value)) return `Campo "${this.nome}" deve ser UUID.`;
        return null;
      }
      case 'booleano': {
        if (typeof value !== 'boolean') return `Campo "${this.nome}" deve ser booleano.`;
        return null;
      }
      case 'array': {
        if (!Array.isArray(value)) return `Campo "${this.nome}" deve ser array.`;
        if (value.length < this.opcoes.min) return `Campo "${this.nome}" deve ter no mínimo ${this.opcoes.min} itens.`;
        if (value.length > this.opcoes.max) return `Campo "${this.nome}" deve ter no máximo ${this.opcoes.max} itens.`;
        return null;
      }
      case 'custom': {
        const r = this.opcoes.fn(value);
        if (r !== true && r !== null && r !== undefined) return r || `Campo "${this.nome}" inválido.`;
        return null;
      }
      default:
        return null;
    }
  }
}

function campo(nome) {
  return new ValidadorCampo(nome);
}

/**
 * Middleware factory: recebe lista de validadores e aplica.
 *
 *   router.post('/foo', validar([
 *     campo('nome').presente().texto({ min: 1, max: 100 }),
 *   ]), handler);
 *
 * Se algum campo falhar, responde 400 e bloqueia a próxima middleware.
 * Caso contrário, anexa `req.body` sanitizado em `req.bodySan`.
 */
function validar(validadores) {
  return (req, res, next) => {
    const erros = [];
    const sanitizado = {};

    for (const v of validadores) {
      const value = req.body?.[v.nome];
      const err = v._validar(value);
      if (err) erros.push({ campo: v.nome, erro: err });

      // Sanitiza strings antes de propagar
      if (typeof value === 'string') {
        sanitizado[v.nome] = v.tipo === 'whatsapp' ? value.replace(/\D/g, '') : sanitizarString(value);
      } else {
        sanitizado[v.nome] = value;
      }
    }

    if (erros.length > 0) {
      return res.status(400).json({ ok: false, erro: erros[0].erro, campos: erros });
    }

    // Substitui body pelo sanitizado (mantém campos não validados)
    req.body = { ...req.body, ...sanitizado };
    next();
  };
}

module.exports = { campo, validar, sanitizarString, LIMITES, PATTERNS };
