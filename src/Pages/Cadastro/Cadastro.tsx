// src/Pages/Cadastro/Cadastro.tsx
import React, { useEffect, useState } from "react";
import { IMaskInput } from "react-imask";
import jsPDF from "jspdf";
import type { Atleta } from "../../Types/Atleta";
import { addAtleta, updateAtleta, deleteAtleta, subscribeAtletas } from "../../services/atletasSer";
const logoUrl = "/logo.png";

function calcularIdade(dataNascimento: string): number {
  if (!dataNascimento) return 0;
  const hoje = new Date();
  const nascimento = new Date(dataNascimento);
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mes = hoje.getMonth() - nascimento.getMonth();
  if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) idade--;
  return idade;
}

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn("fetchImageAsDataUrl erro:", err);
    return null;
  }
}

type CadastroAluno = {
  nome: string;
  dataNascimento: string;
  idade: number;
  responsavelLegal: string;
  telefone: string;
  cpfAluno: string;
  cpfResponsavel: string;
};

function getFirebaseErrorMessage(err: unknown) {
  const code = (err as any)?.code;
  if (code === "permission-denied") {
    return "Permissão insuficiente no Firestore. Verifique as regras de segurança.";
  }
  return "Erro ao salvar atleta. Veja o console.";
}

export default function CadastroAtleta() {
  const [atletas, setAtletas] = useState<(Atleta & { id: string })[]>([]);
  const [novoAtleta, setNovoAtleta] = useState<CadastroAluno>({
    nome: "",
    dataNascimento: "",
    idade: 0,
    responsavelLegal: "",
    telefone: "",
    cpfAluno: "",
    cpfResponsavel: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadingExport, setLoadingExport] = useState(false);

  useEffect(() => {
    const unsub = subscribeAtletas((lista) => setAtletas(lista));
    return () => unsub();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "dataNascimento") {
      const idadeCalculada = calcularIdade(value);
      setNovoAtleta({ ...novoAtleta, dataNascimento: value, idade: idadeCalculada });
    } else {
      setNovoAtleta({ ...novoAtleta, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (
        novoAtleta.cpfAluno &&
        novoAtleta.cpfResponsavel &&
        novoAtleta.cpfAluno === novoAtleta.cpfResponsavel
      ) {
        alert("O CPF do aluno não pode ser o mesmo do responsável.");
        return;
      }
      const payload = {
        nome: novoAtleta.nome,
        dataNascimento: novoAtleta.dataNascimento,
        idade: novoAtleta.idade,
        responsavelLegal: novoAtleta.responsavelLegal,
        responsavel: novoAtleta.responsavelLegal,
        telefone: novoAtleta.telefone,
        cpfAluno: novoAtleta.cpfAluno,
        cpfResponsavel: novoAtleta.cpfResponsavel,
      };
      if (editingId) {
        await updateAtleta(editingId, payload as any);
        setEditingId(null);
      } else {
        await addAtleta(payload as any);
      }
      setNovoAtleta({
        nome: "",
        dataNascimento: "",
        idade: 0,
        responsavelLegal: "",
        telefone: "",
        cpfAluno: "",
        cpfResponsavel: "",
      });
    } catch (err) {
      console.error("Erro ao salvar atleta:", err);
      alert(getFirebaseErrorMessage(err));
    }
  };

  const handleEdit = (a: Atleta & { id: string }) => {
    setEditingId(a.id);
    setNovoAtleta({
      nome: a.nome ?? "",
      dataNascimento: a.dataNascimento ?? "",
      idade: a.idade ?? 0,
      responsavelLegal: (a as any).responsavelLegal ?? (a as any).responsavel ?? "",
      telefone: a.telefone ?? "",
      cpfAluno: (a as any).cpfAluno ?? "",
      cpfResponsavel: (a as any).cpfResponsavel ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const exportarPDF = async (lista: (Atleta & { id: string })[]) => {
    setLoadingExport(true);
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginLeft = 40;
      const marginRight = 40;
      const marginTop = 40;
      const marginBottom = 40;
      const contentWidth = pageWidth - marginLeft - marginRight;
      const contentHeight = pageHeight - marginTop - marginBottom;

      const logoDataUrl = await fetchImageAsDataUrl(logoUrl).catch((e) => {
        console.warn("Erro ao buscar logo:", e);
        return null;
      });

      const renderBilhete = (a: Atleta & { id: string }, index: number) => {
        if (index > 0) doc.addPage();

        const x = marginLeft;
        const y = marginTop;

        // Card border
        doc.setDrawColor(120);
        doc.setLineWidth(0.8);
        doc.rect(x, y, contentWidth, contentHeight);

        // Header
        let cursorY = y + 30;
        if (logoDataUrl) {
          try {
            doc.addImage(logoDataUrl, "PNG", x + 10, y + 10, 40, 40);
          } catch (e) {
            console.warn("addImage falhou:", e);
          }
        }
        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.text("Bilhete de Autorização", x + 60, y + 35);

        // Divider
        doc.setDrawColor(200);
        doc.setLineWidth(0.5);
        doc.line(x + 10, y + 60, x + contentWidth - 10, y + 60);

        // Body
        cursorY = y + 85;
        doc.setFontSize(12);

        const responsavel =
          (a as any).responsavelLegal ?? (a as any).responsavel ?? "-";

        doc.text(`Nome do aluno: ${a.nome || "-"}`, x + 10, cursorY);
        cursorY += 18;
        doc.text(`CPF do aluno: ${(a as any).cpfAluno || "-"}`, x + 10, cursorY);
        cursorY += 18;
        doc.text(`Data de nascimento: ${a.dataNascimento || "-"}`, x + 10, cursorY);
        cursorY += 18;
        doc.text(`Idade: ${a.idade?.toString() || "-"}`, x + 10, cursorY);
        cursorY += 18;
        doc.text(`Responsável legal: ${responsavel}`, x + 10, cursorY);
        cursorY += 18;
        doc.text(`CPF do responsável: ${(a as any).cpfResponsavel || "-"}`, x + 10, cursorY);
        cursorY += 18;
        doc.text(`Telefone de contato: ${a.telefone || "-"}`, x + 10, cursorY);
        cursorY += 22;

        // Divider
        doc.line(x + 10, cursorY, x + contentWidth - 10, cursorY);
        cursorY += 18;

        // Authorization text
        doc.setFontSize(11);
        doc.text(
          "Declaro responsável legal pela criança acima, autorizo sua participação nas atividades do Projeto de Basquete. Estou ciente de que se trata de atividades esportivas e recreativas, e assumo a responsabilidade pela participação da criança.",
          x + 10,
          cursorY,
          { maxWidth: contentWidth - 20 }
        );
        cursorY += 40;

        // Signature / date lines
        doc.setLineWidth(0.5);
        doc.line(x + 10, cursorY, x + contentWidth - 10, cursorY);
        doc.setFontSize(10);
        doc.text("Assinatura do responsável", x + 10, cursorY + 12);

        const dateY = cursorY + 40;
        doc.line(x + 10, dateY, x + 180, dateY);
        doc.text("Data", x + 10, dateY + 12);
      };

      lista.forEach(renderBilhete);

      doc.save("bilhetes.pdf");
    } catch (err) {
      console.error("exportarPDF erro:", err);
      alert("Erro ao gerar PDF. Veja o console para detalhes.");
    } finally {
      setLoadingExport(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            Cadastro de Atletas
          </h2>
          <p className="text-gray-600">Gerencie informações dos atletas</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-lg shadow p-6 space-y-4"
            >
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                {editingId ? "Editar Atleta" : "Novo Atleta"}
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do aluno
                </label>
                <input
                  name="nome"
                  placeholder="Nome completo"
                  value={novoAtleta.nome}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Nascimento
                </label>
                <input
                  name="dataNascimento"
                  type="date"
                  value={novoAtleta.dataNascimento}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Idade
                </label>
                <input
                  name="idade"
                  type="number"
                  value={novoAtleta.idade}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Responsável legal
                </label>
                <input
                  name="responsavelLegal"
                  placeholder="Nome do responsável"
                  value={novoAtleta.responsavelLegal}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone de contato
                </label>
                <IMaskInput
                  mask="(00) 00000-0000"
                  name="telefone"
                  value={novoAtleta.telefone}
                  onAccept={(value: string) =>
                    setNovoAtleta({ ...novoAtleta, telefone: value })
                  }
                  placeholder="(11) 98765-4321"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CPF do aluno
                </label>
                <IMaskInput
                  mask="000.000.000-00"
                  name="cpfAluno"
                  value={novoAtleta.cpfAluno}
                  onAccept={(value: string) =>
                    setNovoAtleta({ ...novoAtleta, cpfAluno: value })
                  }
                  placeholder="000.000.000-00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CPF do responsável
                </label>
                <IMaskInput
                  mask="000.000.000-00"
                  name="cpfResponsavel"
                  value={novoAtleta.cpfResponsavel}
                  onAccept={(value: string) =>
                    setNovoAtleta({ ...novoAtleta, cpfResponsavel: value })
                  }
                  placeholder="000.000.000-00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white font-medium py-2 rounded-md hover:bg-blue-700 transition"
                >
                  {editingId ? "Salvar" : "Cadastrar"}
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await exportarPDF(atletas);
                    } catch (e) {
                      console.error(e);
                      alert("Falha ao exportar PDF");
                    }
                  }}
                  disabled={loadingExport}
                  className="flex-1 bg-green-600 text-white font-medium py-2 rounded-md hover:bg-green-700 transition disabled:bg-gray-400"
                >
                  {loadingExport ? "Gerando..." : "Exportar PDF"}
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                Lista de Atletas ({atletas.length})
              </h3>

              <div className="space-y-4">
                {atletas.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">Nenhum atleta cadastrado</p>
                  </div>
                )}

                {atletas.map((a) => {
                  const responsavel =
                    (a as any).responsavelLegal ?? (a as any).responsavel ?? "";
                    const handleDelete = async (id: string): Promise<void> => {
                    const ok = window.confirm("Tem certeza que deseja excluir este atleta?");
                    if (!ok) return;
                    try {
                      await deleteAtleta(id);
                    } catch (err) {
                      console.error("Erro ao excluir atleta:", err);
                      alert("Erro ao excluir atleta. Veja o console.");
                    }
                    };

                  return (
                    <div
                      key={a.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold text-gray-800">{a.nome}</p>
                          <p className="text-sm text-gray-500">
                            Responsável: {responsavel}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(a)}
                            className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded text-sm font-medium transition"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(a.id)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-medium transition"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                        <div className="bg-gray-50 rounded p-2">
                          <p className="text-xs text-gray-600 mb-1">Nascimento</p>
                          <p className="font-semibold text-gray-800">
                            {a.dataNascimento || "-"}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded p-2">
                          <p className="text-xs text-gray-600 mb-1">Idade</p>
                          <p className="font-semibold text-gray-800">
                            {a.idade ?? "-"} anos
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded p-2">
                          <p className="text-xs text-gray-600 mb-1">Telefone</p>
                          <p className="font-semibold text-gray-800 text-sm">
                            {a.telefone || "-"}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded p-2">
                          <p className="text-xs text-gray-600 mb-1">CPF do aluno</p>
                          <p className="font-semibold text-gray-800">
                            {(a as any).cpfAluno || "-"}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded p-2">
                          <p className="text-xs text-gray-600 mb-1">CPF do responsável</p>
                          <p className="font-semibold text-gray-800">
                            {(a as any).cpfResponsavel || "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
