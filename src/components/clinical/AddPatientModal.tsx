'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { addPatient } from '@/app/dashboard/clinical/patients/actions';
import { Loader2, PlusCircle } from 'lucide-react';

export function AddPatientModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    await addPatient(formData);
    setLoading(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 border-0 shadow-lg shadow-blue-900/20 font-semibold rounded-lg">
          <PlusCircle className="w-4 h-4" /> Novo Paciente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-[#09090b] text-zinc-100 border border-zinc-800 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Cadastrar Novo Atleta</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Crie a ficha cadastral para atrelar instantaneamente o atleta à vigilância preditiva e ao cálculo de Inol.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-5 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-zinc-300 font-medium">Nome Completo</Label>
            <Input 
               id="name" 
               name="name" 
               required 
               className="bg-[#121214] border-zinc-800 text-zinc-100 placeholder:text-zinc-600 h-11 focus-visible:ring-blue-500" 
               placeholder="Ex: Kipchoge Eliud" 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-zinc-300 font-medium">Correio Clínico (e-Mail)</Label>
            <Input 
               id="email" 
               name="email" 
               type="email" 
               required 
               className="bg-[#121214] border-zinc-800 text-zinc-100 placeholder:text-zinc-600 h-11 focus-visible:ring-blue-500" 
               placeholder="atleta@dominio.com" 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weightKg" className="text-zinc-300 font-medium">Peso Corporal (Kg)</Label>
            <Input 
               id="weightKg" 
               name="weightKg" 
               type="number" 
               step="0.1" 
               required 
               className="bg-[#121214] border-zinc-800 text-zinc-100 placeholder:text-zinc-600 h-11 focus-visible:ring-blue-500" 
               placeholder="Ex: 72.5" 
            />
          </div>
          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full h-11 text-base font-bold shadow-lg shadow-emerald-900/20 border-0">
              {loading ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processando Sync...</>
              ) : (
                'Finalizar Cadastro do Paciente'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
