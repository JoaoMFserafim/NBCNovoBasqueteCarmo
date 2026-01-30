// src/Pages/Cadastro/Cadastro.tsx
import React, { useEffect, useState } from "react";
import { IMaskInput } from "react-imask";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Atleta } from "../../Types/Atleta";
import { addAtleta, updateAtleta, deleteAtleta, subscribeAtletas } from "../../services/atletasSer";

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
    altura: 0,
    peso: 0,
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
      setNovoAtleta({ ...novoAtleta, dataNascimento: value, idade: idadeCalculada });
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
        altura: 0,
        peso: 0,
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
            doc.addImage(logoDataUrl, "PNG", marginLeft, y - 10, logoWidth, logoHeight);
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
        headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255], halign: "center" },
        didDrawPage: (data: any) => {
          const pageCount = doc.getNumberOfPages();
          header();
          const pageHeight = doc.internal.pageSize.getHeight();
          doc.setFontSize(10);
          doc.setTextColor(120);
          const pageText = `Página ${data.pageNumber} de ${pageCount}`;
          doc.text(pageText, pageWidth - marginRight - doc.getTextWidth(pageText), pageHeight - 30);
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
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4">
      <h2 className="text-2xl font-bold text-blue-600 mb-6">Cadastro de Atletas</h2>

      <div className="flex flex-col lg:flex-row gap-8 w-full max-w-6xl">
        <form
          onSubmit={handleSubmit}
          className="bg-white shadow-md rounded-lg p-6 w-full lg:w-1/2 space-y-4"
        >
          <input
            name="nome"
            placeholder="Nome"
            value={novoAtleta.nome}
            onChange={handleChange}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-400"
          />

          <IMaskInput
            mask="000.000.000-00"
            name="cpf"
            value={novoAtleta.cpf}
            onAccept={(value: string) => setNovoAtleta({ ...novoAtleta, cpf: value })}
            placeholder="CPF"
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-400"
          />

          <input
            name="dataNascimento"
            type="date"
            value={novoAtleta.dataNascimento}
            onChange={handleChange}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-400"
          />
          <p>Idade</p>
          <input
            name="idade"
            type="number"
            placeholder="Idade"
            value={novoAtleta.idade}
            readOnly
            className="w-full p-2 border rounded bg-gray-100"
          />
          <p>Altura(cm)</p>
          <input
            name="altura"
            type="number"
            placeholder="Altura (cm)"
            value={novoAtleta.altura}
            onChange={handleChange}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-400"
          />
          <p>Peso(kg)</p>
          <input
            name="peso"
            type="number"
            placeholder="Peso (kg)"
            value={novoAtleta.peso}
            onChange={handleChange}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-400"
          />

          <input
            name="endereco"
            placeholder="Endereço"
            value={novoAtleta.endereco}
            onChange={handleChange}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-400"
          />

          <input
            name="numero"
            placeholder="Número"
            value={novoAtleta.numero}
            onChange={handleChange}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-400"
          />

          <input
            name="cidade"
            placeholder="Cidade"
            value={novoAtleta.cidade}
            onChange={handleChange}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-400"
          />

          <input
            name="estado"
            placeholder="Estado"
            value={novoAtleta.estado}
            onChange={handleChange}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-400"
          />

          <IMaskInput
            mask="00000-000"
            name="cep"
            value={novoAtleta.cep}
            onAccept={(value: string) => setNovoAtleta({ ...novoAtleta, cep: value })}
            placeholder="CEP"
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-400"
          />

          <IMaskInput
            mask="(00) 00000-0000"
            name="telefone"
            value={novoAtleta.telefone}
            onAccept={(value: string) => setNovoAtleta({ ...novoAtleta, telefone: value })}
            placeholder="Telefone"
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-400"
          />

          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition"
            >
              {editingId ? "Salvar alterações" : "Cadastrar"}
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
              className="flex-1 bg-green-600 text-white p-2 rounded hover:bg-green-700 transition"
            >
              {loadingExport ? "Gerando PDF..." : "Exportar PDF"}
            </button>
          </div>
        </form>

        <div className="w-full lg:w-1/2">
          <h3 className="text-xl font-semibold mb-4">Lista de Atletas</h3>
          <ul className="space-y-3">
            {atletas.length === 0 && (
              <li className="text-sm text-gray-500">Nenhum atleta cadastrado ainda.</li>
            )}
            {atletas.map((a) => (
              <li key={a.id} className="bg-white shadow rounded p-4 text-sm text-gray-700">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-blue-600">{a.nome}</p>
                    <p className="text-xs text-gray-500">CPF: {a.cpf}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(a)}
                      className="text-sm bg-yellow-400 text-white px-3 py-1 rounded"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="text-sm bg-red-500 text-white px-3 py-1 rounded"
                    >
                      Excluir
                    </button>
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="font-medium">Idade</p>
                    <p>{a.idade} anos</p>
                  </div>
                  <div>
                    <p className="font-medium">Telefone</p>
                    <p>{a.telefone}</p>
                  </div>
                </div>

                <p className="mt-2 text-sm">
                  Endereço: {a.endereco}, {a.numero} — {a.cidade}/{a.estado} — CEP: {a.cep}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
