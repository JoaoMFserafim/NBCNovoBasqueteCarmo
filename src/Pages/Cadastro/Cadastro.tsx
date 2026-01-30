// src/Pages/Cadastro/Cadastro.tsx
import React, { useEffect, useState } from "react";
import { IMaskInput } from "react-imask";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Atleta } from "../../Types/Atleta";
import {
  addAtleta,
  updateAtleta,
  deleteAtleta,
  subscribeAtletas,
} from "../../services/atletasSer";

/** Ajuste se necessário: coloque logo em public/logo.png */
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

type AtletaLocal = Atleta & { id?: string };

export default function CadastroAtleta() {
  const [atletas, setAtletas] = useState<(Atleta & { id: string })[]>([]);
  const [novoAtleta, setNovoAtleta] = useState<AtletaLocal>({
    id: "",
    nome: "",
    cpf: "",
    dataNascimento: "",
    idade: 0,
    altura: "",
    peso: "",
    endereco: "",
    numero: "",
    cidade: "",
    estado: "",
    cep: "",
    telefone: "",
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
      setNovoAtleta({
        ...novoAtleta,
        dataNascimento: value,
        idade: idadeCalculada,
      });
    } else if (name === "altura" || name === "peso") {
      setNovoAtleta({ ...novoAtleta, [name]: Number(value) });
    } else {
      setNovoAtleta({ ...novoAtleta, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateAtleta(editingId, novoAtleta);
        setEditingId(null);
      } else {
        const { id, ...payload } = novoAtleta;
        await addAtleta(payload);
      }
      setNovoAtleta({
        id: "",
        nome: "",
        cpf: "",
        dataNascimento: "",
        idade: 0,
        altura: "",
        peso: "",
        endereco: "",
        numero: "",
        cidade: "",
        estado: "",
        cep: "",
        telefone: "",
      });
    } catch (err) {
      console.error("Erro ao salvar atleta:", err);
      alert("Erro ao salvar atleta. Veja o console.");
    }
  };

  const handleEdit = (a: Atleta & { id: string }) => {
    setEditingId(a.id);
    setNovoAtleta({
      ...a,
      id: a.id,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este atleta?")) return;
    try {
      await deleteAtleta(id);
    } catch (err) {
      console.error("Erro ao deletar:", err);
      alert("Erro ao deletar atleta. Veja o console.");
    }
  };

  const exportarPDF = async (lista: (Atleta & { id: string })[]) => {
    setLoadingExport(true);
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const marginLeft = 40;
      const marginRight = 40;

      const logoDataUrl = await fetchImageAsDataUrl(logoUrl).catch((e) => {
        console.warn("Erro ao buscar logo:", e);
        return null;
      });

      const header = () => {
        const y = 30;
        if (logoDataUrl) {
          const logoWidth = 60;
          const logoHeight = 60;
          try {
            doc.addImage(
              logoDataUrl,
              "PNG",
              marginLeft,
              y - 10,
              logoWidth,
              logoHeight,
            );
          } catch (e) {
            console.warn("addImage falhou:", e);
          }
        }
        doc.setFontSize(18);
        doc.setTextColor(41, 128, 185);
        const titleX = logoDataUrl ? marginLeft + 80 : marginLeft;
        doc.text("Lista de Atletas", titleX, y + 30);
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.5);
        doc.line(marginLeft, y + 45, pageWidth - marginRight, y + 45);
      };

      const colunas = [
        "Nome",
        "CPF",
        "Data Nasc.",
        "Idade",
        "Altura",
        "Peso",
        "Endereço",
        "Número",
        "Cidade",
        "Estado",
        "CEP",
        "Telefone",
      ];

      const linhas = lista.map((a) => [
        a.nome || "-",
        a.cpf || "-",
        a.dataNascimento || "-",
        a.idade?.toString() || "-",
        a.altura?.toString() || "-",
        a.peso?.toString() || "-",
        a.endereco || "-",
        a.numero || "-",
        a.cidade || "-",
        a.estado || "-",
        a.cep || "-",
        a.telefone || "-",
      ]);

      (autoTable as any)(doc, {
        head: [colunas],
        body: linhas,
        startY: 100,
        margin: { left: marginLeft, right: marginRight },
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: [255, 255, 255],
          halign: "center",
        },
        didDrawPage: (data: any) => {
          const pageCount = doc.getNumberOfPages();
          header();
          const pageHeight = doc.internal.pageSize.getHeight();
          doc.setFontSize(10);
          doc.setTextColor(120);
          const pageText = `Página ${data.pageNumber} de ${pageCount}`;
          doc.text(
            pageText,
            pageWidth - marginRight - doc.getTextWidth(pageText),
            pageHeight - 30,
          );
        },
      });

      doc.save("atletas.pdf");
    } catch (err) {
      console.error("exportarPDF erro:", err);
      alert("Erro ao gerar PDF. Veja o console para detalhes.");
    } finally {
      setLoadingExport(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-indigo-600 mb-2">
            Cadastro de Atletas
          </h2>
          <p className="text-gray-600 text-lg">
            Gerencie informações de atletas de forma simples e eficiente
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-1">
            <form
              onSubmit={handleSubmit}
              className="bg-white shadow-lg rounded-2xl p-8 space-y-5 sticky top-8"
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Novo Atleta
              </h3>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nome *
                </label>
                <input
                  name="nome"
                  placeholder="Digite o nome completo"
                  value={novoAtleta.nome}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  CPF *
                </label>
                <IMaskInput
                  mask="000.000.000-00"
                  name="cpf"
                  value={novoAtleta.cpf}
                  onAccept={(value: string) =>
                    setNovoAtleta({ ...novoAtleta, cpf: value })
                  }
                  placeholder="000.000.000-00"
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Data de Nascimento *
                </label>
                <input
                  name="dataNascimento"
                  type="date"
                  value={novoAtleta.dataNascimento}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Idade
                </label>
                <input
                  name="idade"
                  type="number"
                  placeholder="Calculada automaticamente"
                  value={novoAtleta.idade}
                  readOnly
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Altura (cm) *
                  </label>
                  <input
                    name="altura"
                    type="number"
                    placeholder="Ex: 175"
                    value={novoAtleta.altura}
                    onChange={handleChange}
                    step="0.1"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Peso (kg) *
                  </label>
                  <input
                    name="peso"
                    type="number"
                    placeholder="Ex: 70"
                    value={novoAtleta.peso}
                    onChange={handleChange}
                    step="0.1"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Endereço *
                </label>
                <input
                  name="endereco"
                  placeholder="Rua, avenida, etc"
                  value={novoAtleta.endereco}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Número *
                </label>
                <input
                  name="numero"
                  placeholder="Número do imóvel"
                  value={novoAtleta.numero}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Cidade *
                  </label>
                  <input
                    name="cidade"
                    placeholder="Cidade"
                    value={novoAtleta.cidade}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Estado *
                  </label>
                  <input
                    name="estado"
                    placeholder="SP, RJ, etc"
                    maxLength={2}
                    value={novoAtleta.estado}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  CEP *
                </label>
                <IMaskInput
                  mask="00000-000"
                  name="cep"
                  value={novoAtleta.cep}
                  onAccept={(value: string) =>
                    setNovoAtleta({ ...novoAtleta, cep: value })
                  }
                  placeholder="00000-000"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Telefone *
                </label>
                <IMaskInput
                  mask="(00) 00000-0000"
                  name="telefone"
                  value={novoAtleta.telefone}
                  onAccept={(value: string) =>
                    setNovoAtleta({ ...novoAtleta, telefone: value })
                  }
                  placeholder="(00) 00000-0000"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-linear-to-r from-blue-600 to-blue-700 text-white font-semibold py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition transform hover:scale-105 shadow-md"
                >
                  {editingId ? "💾 Salvar Alterações" : "➕ Cadastrar"}
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
                  className="flex-1 bg-linear-to-r from-green-600 to-green-700 text-white font-semibold py-3 rounded-lg hover:from-green-700 hover:to-green-800 transition transform hover:scale-105 shadow-md disabled:opacity-50"
                >
                  {loadingExport ? "⏳ Gerando..." : "📄 Exportar PDF"}
                </button>
              </div>
            </form>
          </div>

          {/* List Section */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow-lg rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Lista de Atletas ({atletas.length})
              </h3>

              <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                {atletas.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <p className="text-gray-500 text-lg">
                      📋 Nenhum atleta cadastrado ainda.
                    </p>
                    <p className="text-gray-400 text-sm mt-2">
                      Preencha o formulário e cadastre atletas
                    </p>
                  </div>
                )}

                {atletas.map((a) => (
                  <div
                    key={a.id}
                    className="bg-linear-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 hover:shadow-lg transition transform hover:scale-102"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <p className="font-bold text-lg text-blue-600">{a.nome}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          CPF:{" "}
                          <span className="font-mono">{a.cpf}</span>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(a)}
                          className="bg-yellow-400 hover:bg-yellow-500 text-white font-semibold px-4 py-2 rounded-lg transition shadow-md text-sm"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => handleDelete(a.id)}
                          className="bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded-lg transition shadow-md text-sm"
                        >
                          🗑️ Excluir
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-white rounded-lg p-3">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          Idade
                        </p>
                        <p className="text-xl font-bold text-blue-600 mt-1">
                          {a.idade}{" "}
                          <span className="text-sm text-gray-500">anos</span>
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-3">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          Altura
                        </p>
                        <p className="text-xl font-bold text-blue-600 mt-1">
                          {a.altura}{" "}
                          <span className="text-sm text-gray-500">cm</span>
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-3">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          Peso
                        </p>
                        <p className="text-xl font-bold text-blue-600 mt-1">
                          {a.peso}{" "}
                          <span className="text-sm text-gray-500">kg</span>
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-3">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          Telefone
                        </p>
                        <p className="text-lg font-bold text-blue-600 mt-1 font-mono">
                          {a.telefone}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 bg-white rounded-lg p-3">
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">📍 Endereço:</span> {a.endereco}, {a.numero} — {a.cidade}/{a.estado} — {a.cep}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
