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
                  Nome
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
                  CPF
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Altura (cm)
                  </label>
                  <input
                    name="altura"
                    type="number"
                    placeholder="175"
                    value={novoAtleta.altura}
                    onChange={handleChange}
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Peso (kg)
                  </label>
                  <input
                    name="peso"
                    type="number"
                    placeholder="70"
                    value={novoAtleta.peso}
                    onChange={handleChange}
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Endereço
                </label>
                <input
                  name="endereco"
                  placeholder="Rua, avenida"
                  value={novoAtleta.endereco}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número
                </label>
                <input
                  name="numero"
                  placeholder="123"
                  value={novoAtleta.numero}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cidade
                  </label>
                  <input
                    name="cidade"
                    placeholder="São Paulo"
                    value={novoAtleta.cidade}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <input
                    name="estado"
                    placeholder="SP"
                    maxLength={2}
                    value={novoAtleta.estado}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CEP
                </label>
                <IMaskInput
                  mask="00000-000"
                  name="cep"
                  value={novoAtleta.cep}
                  onAccept={(value: string) =>
                    setNovoAtleta({ ...novoAtleta, cep: value })
                  }
                  placeholder="00000-000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone
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

                {atletas.map((a) => (
                  <div
                    key={a.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-semibold text-gray-800">{a.nome}</p>
                        <p className="text-sm text-gray-500">CPF: {a.cpf}</p>
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

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs text-gray-600 mb-1">Idade</p>
                        <p className="font-semibold text-gray-800">{a.idade} anos</p>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs text-gray-600 mb-1">Altura</p>
                        <p className="font-semibold text-gray-800">{a.altura} cm</p>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs text-gray-600 mb-1">Peso</p>
                        <p className="font-semibold text-gray-800">{a.peso} kg</p>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs text-gray-600 mb-1">Telefone</p>
                        <p className="font-semibold text-gray-800 text-sm">{a.telefone}</p>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-sm text-gray-700">
                        {a.endereco}, {a.numero} - {a.cidade}/{a.estado} - {a.cep}
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
