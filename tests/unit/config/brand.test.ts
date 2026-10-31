import { describe, it, expect } from "vitest";
import { brand } from "@/config/brand";
import fs from "fs";
import path from "path";

describe("Configuração Institucional e de Marca (brand.ts)", () => {
  it("deve exportar os metadados corretos de identificação da marca e da empresa", () => {
    expect(brand.name).toBe("JurisFlow");
    expect(brand.slug).toBe("jurisflow");
    expect(brand.company.name).toBe("Triforce System");
    expect(brand.urls.termsOfService).toBe("/termos-de-uso");
    expect(brand.urls.privacyPolicy).toBe("/politica-de-privacidade");
  });

  it("deve estar congelado em profundidade (deep freeze) em todos os níveis do objeto", () => {
    // 1. Verificação de congelamento estrutural em cada nível
    expect(Object.isFrozen(brand)).toBe(true);
    expect(Object.isFrozen(brand.company)).toBe(true);
    expect(Object.isFrozen(brand.contact)).toBe(true);
    expect(Object.isFrozen(brand.urls)).toBe(true);
    expect(Object.isFrozen(brand.social)).toBe(true);

    // 2. Verificação de que tentativas de mutação em runtime disparam exceção
    expect(() => {
      // @ts-expect-error - Tentativa intencional de mutação em runtime
      brand.name = "OutroNome";
    }).toThrow();

    expect(() => {
      // @ts-expect-error - Tentativa intencional de mutação em nível aninhado
      brand.company.name = "OutraEmpresa";
    }).toThrow();

    expect(() => {
      // @ts-expect-error - Tentativa intencional de mutação em contato
      brand.contact.supportEmail = "hacked@fake.com";
    }).toThrow();

    expect(() => {
      // @ts-expect-error - Tentativa intencional de mutação em URLs
      brand.urls.website = "https://fake.com";
    }).toThrow();
  });

  it('deve garantir que todos os contatos e URLs institucionais contêm "exemplo.com.br" ou "TODO"', () => {
    // Garante que nenhum dado fictício passe despercebido para produção sem revisão explícita
    expect(brand.contact.generalEmail).toContain("exemplo.com.br");
    expect(brand.contact.supportEmail).toContain("exemplo.com.br");
    expect(brand.contact.privacyEmail).toContain("exemplo.com.br");
    expect(brand.urls.website).toContain("exemplo.com.br");

    expect(brand.company.legalName).toContain("TODO");
    expect(brand.company.cnpj).toBe("00.000.000/0000-00");
    expect(brand.company.address).toContain("TODO");
    expect(brand.social.linkedin).toContain("TODO");
    expect(brand.social.instagram).toContain("TODO");

    // Asserção explícita: phone contém TODO e nenhum valor de contato está vazio
    expect(brand.contact.phone).toContain("TODO");
    Object.entries(brand.contact).forEach(([key, value]) => {
      expect(
        value.trim(),
        `O campo de contato '${key}' não pode estar vazio`,
      ).not.toBe("");
    });
  });

  it('NÃO deve conter "JurisFlow" ou "Triforce" hardcoded no código de src/ (fora de src/config/brand.ts e comentários)', () => {
    const srcDir = path.resolve(process.cwd(), "src");
    const brandFilePath = path.resolve(srcDir, "config", "brand.ts");

    const violations: string[] = [];

    // Abordagem segura: remove blocos /* ... */ e ignora estritamente linhas de comentário
    // sem remover "https://" ou "http://" presentes em strings literais de código
    function stripComments(source: string): string {
      const withoutBlockComments = source.replace(
        /\/\*[\s\S]*?\*\//g,
        (match) => match.replace(/[^\n]/g, " "),
      );

      return withoutBlockComments
        .split("\n")
        .map((line) => {
          const trimmed = line.trim();
          if (trimmed.startsWith("//") || trimmed.startsWith("*")) {
            return "";
          }
          return line;
        })
        .join("\n");
    }

    // Validação preventiva: garante que a função preserva URLs com https://
    const testSnippet = 'const url = "https://jurisflow.com.br";';
    expect(stripComments(testSnippet)).toContain("https://jurisflow.com.br");

    function scanDirectory(dir: string) {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          scanDirectory(fullPath);
        } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
          // Ignora o próprio arquivo de definição da marca
          if (path.resolve(fullPath) === brandFilePath) {
            continue;
          }

          const rawCode = fs.readFileSync(fullPath, "utf-8");
          const stripped = stripComments(rawCode);
          const lines = stripped.split("\n");

          lines.forEach((line, index) => {
            if (/jurisflow|triforce/i.test(line)) {
              const relPath = path
                .relative(process.cwd(), fullPath)
                .replace(/\\/g, "/");
              violations.push(`${relPath}:${index + 1} -> ${line.trim()}`);
            }
          });
        }
      }
    }

    scanDirectory(srcDir);

    expect(
      violations,
      `Foram encontrados nomes de marca hardcoded no código em src/:\n${violations.join("\n")}\nUtilize a constante 'brand' importada de '@/config/brand'.`,
    ).toEqual([]);
  });
});
