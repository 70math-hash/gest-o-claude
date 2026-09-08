import { Suspense } from "react";
import { FormularioEntrar } from "./formulario";

export const metadata = { title: "Entrar · QT GESTÃO" };

export default function PaginaEntrar() {
  return (
    <main className="min-h-dvh flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <div className="text-3xl font-bold tracking-wide">QT GESTÃO</div>
          <div className="mt-1 text-sm text-cinza">Gestão e controladoria do QT Pizza Bar</div>
        </div>
        <Suspense>
          <FormularioEntrar />
        </Suspense>
      </div>
    </main>
  );
}
