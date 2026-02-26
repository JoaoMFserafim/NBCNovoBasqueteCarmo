// src/services/atletas.ts
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import type { Atleta } from "../Types/Atleta";

const atletasCol = collection(db, "atletas");

export async function addAtleta(atleta: Partial<Atleta>) {
  const payload = {
    ...atleta,
    createdAt: Timestamp.now(),
  };
  return await addDoc(atletasCol, payload);
}

export async function updateAtleta(id: string, data: Partial<Atleta>) {
  const ref = doc(db, "atletas", id);
  return await updateDoc(ref, data);
}

export async function deleteAtleta(id: string) {
  const ref = doc(db, "atletas", id);
  return await deleteDoc(ref);
}

export function subscribeAtletas(callback: (lista: (Atleta & { id: string })[]) => void) {
  const q = query(atletasCol, orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        nome: data.nome ?? "",
        cpf: data.cpf ?? "",
        dataNascimento: data.dataNascimento ?? "",
        idade: data.idade ?? 0,
        altura: data.altura ?? 0,
        peso: data.peso ?? 0,
        endereco: data.endereco ?? "",
        numero: data.numero ?? "",
        cidade: data.cidade ?? "",
        estado: data.estado ?? "",
        cep: data.cep ?? "",
        telefone: data.telefone ?? "",
        responsavelLegal: data.responsavelLegal ?? data.responsavel ?? "",
        cpfAluno: data.cpfAluno ?? "",
        cpfResponsavel: data.cpfResponsavel ?? "",
        createdAt: data.createdAt ?? null,
      } as Atleta & { id: string; responsavelLegal?: string; cpfAluno?: string; cpfResponsavel?: string };
    });
    callback(items);
  });
}

export async function fetchAtletasOnce() {
  const q = query(atletasCol, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}
