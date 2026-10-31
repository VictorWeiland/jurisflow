/**
 * Classes de erro customizadas para a camada de autenticação e contexto de tenant.
 * Mapeadas diretamente para códigos HTTP correspondentes.
 */

/**
 * Erro 401 Unauthorized: Usuário não autenticado ou sessão inválida/expirada.
 */
export class AuthRequiredError extends Error {
  readonly statusCode = 401;

  constructor(message = "Autenticação necessária para acessar este recurso") {
    super(message);
    this.name = "AuthRequiredError";
    Object.setPrototypeOf(this, AuthRequiredError.prototype);
  }
}

/**
 * Erro 403 Forbidden: Usuário autenticado tentou acessar uma organização da qual
 * não é membro ativo, ou sua associação está suspensa/desativada.
 */
export class ForbiddenOrgAccessError extends Error {
  readonly statusCode = 403;

  constructor(message = "Acesso não autorizado à organização solicitada") {
    super(message);
    this.name = "ForbiddenOrgAccessError";
    Object.setPrototypeOf(this, ForbiddenOrgAccessError.prototype);
  }
}

/**
 * Erro 400 Bad Request: O cookie de organização ativa não foi informado
 * e nenhuma organização ativa foi especificada na requisição.
 */
export class OrgRequiredError extends Error {
  readonly statusCode = 400;

  constructor(
    message = "Organização não selecionada. O cookie de identificação do tenant é obrigatório.",
  ) {
    super(message);
    this.name = "OrgRequiredError";
    Object.setPrototypeOf(this, OrgRequiredError.prototype);
  }
}
