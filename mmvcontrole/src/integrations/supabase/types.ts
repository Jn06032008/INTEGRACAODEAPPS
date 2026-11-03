export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          acao: string
          created_at: string
          detalhes: Json | null
          id: string
          registro_id: string | null
          tabela: string
          user_id: string | null
          user_nome: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          detalhes?: Json | null
          id?: string
          registro_id?: string | null
          tabela: string
          user_id?: string | null
          user_nome?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          detalhes?: Json | null
          id?: string
          registro_id?: string | null
          tabela?: string
          user_id?: string | null
          user_nome?: string | null
        }
        Relationships: []
      }
      checkout_items: {
        Row: {
          checkout_id: string
          conferido: boolean
          equipment_id: string
          id: string
        }
        Insert: {
          checkout_id: string
          conferido?: boolean
          equipment_id: string
          id?: string
        }
        Update: {
          checkout_id?: string
          conferido?: boolean
          equipment_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkout_items_checkout_id_fkey"
            columns: ["checkout_id"]
            isOneToOne: false
            referencedRelation: "checkouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_items_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      checkouts: {
        Row: {
          acessorios: Json
          assinatura: string | null
          autorizado_por_id: string | null
          autorizado_por_nome: string | null
          created_at: string
          destino: string | null
          equipment_id: string
          estado_saida: string | null
          evento: string | null
          finalidade: string | null
          fotos: Json
          id: string
          kit_id: string | null
          numero: string
          observacoes: string | null
          previsao_devolucao: string | null
          quantidade: number
          responsavel_id: string | null
          responsavel_nome: string
          retirada_em: string
          status: string
          termo_aceito: boolean
          unit_id: string | null
        }
        Insert: {
          acessorios?: Json
          assinatura?: string | null
          autorizado_por_id?: string | null
          autorizado_por_nome?: string | null
          created_at?: string
          destino?: string | null
          equipment_id: string
          estado_saida?: string | null
          evento?: string | null
          finalidade?: string | null
          fotos?: Json
          id?: string
          kit_id?: string | null
          numero?: string
          observacoes?: string | null
          previsao_devolucao?: string | null
          quantidade?: number
          responsavel_id?: string | null
          responsavel_nome: string
          retirada_em?: string
          status?: string
          termo_aceito?: boolean
          unit_id?: string | null
        }
        Update: {
          acessorios?: Json
          assinatura?: string | null
          autorizado_por_id?: string | null
          autorizado_por_nome?: string | null
          created_at?: string
          destino?: string | null
          equipment_id?: string
          estado_saida?: string | null
          evento?: string | null
          finalidade?: string | null
          fotos?: Json
          id?: string
          kit_id?: string | null
          numero?: string
          observacoes?: string | null
          previsao_devolucao?: string | null
          quantidade?: number
          responsavel_id?: string | null
          responsavel_nome?: string
          retirada_em?: string
          status?: string
          termo_aceito?: boolean
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkouts_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkouts_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkouts_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      cleaning_orders: {
        Row: {
          aprovado_por: string | null
          concluido_em: string | null
          created_at: string
          equipment_id: string
          fotos_antes: Json
          fotos_depois: Json
          id: string
          motivo: string | null
          procedimentos: string | null
          responsavel_nome: string | null
          solicitado_em: string
          status: string
          tipo: string
        }
        Insert: {
          aprovado_por?: string | null
          concluido_em?: string | null
          created_at?: string
          equipment_id: string
          fotos_antes?: Json
          fotos_depois?: Json
          id?: string
          motivo?: string | null
          procedimentos?: string | null
          responsavel_nome?: string | null
          solicitado_em?: string
          status?: string
          tipo?: string
        }
        Update: {
          aprovado_por?: string | null
          concluido_em?: string | null
          created_at?: string
          equipment_id?: string
          fotos_antes?: Json
          fotos_depois?: Json
          id?: string
          motivo?: string | null
          procedimentos?: string | null
          responsavel_nome?: string | null
          solicitado_em?: string
          status?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "cleaning_orders_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          unit_id: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          unit_id?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          ativo: boolean
          category_id: string | null
          codigo: string
          created_at: string
          created_by: string | null
          data_compra: string | null
          department_id: string | null
          descricao: string | null
          estado_conservacao: string | null
          fornecedor: string | null
          foto_url: string | null
          frequencia_revisao_dias: number | null
          garantia_meses: number | null
          garantia_vencimento: string | null
          id: string
          location_id: string | null
          marca: string | null
          modelo: string | null
          nome: string
          nota_fiscal: string | null
          numero_serie: string | null
          observacoes: string | null
          patrimonio: string | null
          proxima_revisao: string | null
          quantidade: number
          quantidade_disponivel: number
          responsavel_atual_id: string | null
          responsavel_atual_nome: string | null
          status: string
          ultima_revisao: string | null
          unit_id: string | null
          updated_at: string
          valor_estimado: number | null
        }
        Insert: {
          ativo?: boolean
          category_id?: string | null
          codigo?: string
          created_at?: string
          created_by?: string | null
          data_compra?: string | null
          department_id?: string | null
          descricao?: string | null
          estado_conservacao?: string | null
          fornecedor?: string | null
          foto_url?: string | null
          frequencia_revisao_dias?: number | null
          garantia_meses?: number | null
          garantia_vencimento?: string | null
          id?: string
          location_id?: string | null
          marca?: string | null
          modelo?: string | null
          nome: string
          nota_fiscal?: string | null
          numero_serie?: string | null
          observacoes?: string | null
          patrimonio?: string | null
          proxima_revisao?: string | null
          quantidade?: number
          quantidade_disponivel?: number
          responsavel_atual_id?: string | null
          responsavel_atual_nome?: string | null
          status?: string
          ultima_revisao?: string | null
          unit_id?: string | null
          updated_at?: string
          valor_estimado?: number | null
        }
        Update: {
          ativo?: boolean
          category_id?: string | null
          codigo?: string
          created_at?: string
          created_by?: string | null
          data_compra?: string | null
          department_id?: string | null
          descricao?: string | null
          estado_conservacao?: string | null
          fornecedor?: string | null
          foto_url?: string | null
          frequencia_revisao_dias?: number | null
          garantia_meses?: number | null
          garantia_vencimento?: string | null
          id?: string
          location_id?: string | null
          marca?: string | null
          modelo?: string | null
          nome?: string
          nota_fiscal?: string | null
          numero_serie?: string | null
          observacoes?: string | null
          patrimonio?: string | null
          proxima_revisao?: string | null
          quantidade?: number
          quantidade_disponivel?: number
          responsavel_atual_id?: string | null
          responsavel_atual_nome?: string | null
          status?: string
          ultima_revisao?: string | null
          unit_id?: string | null
          updated_at?: string
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "equipment_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_accessories: {
        Row: {
          created_at: string
          equipment_id: string
          id: string
          nome: string
          obrigatorio: boolean
          quantidade: number
        }
        Insert: {
          created_at?: string
          equipment_id: string
          id?: string
          nome: string
          obrigatorio?: boolean
          quantidade?: number
        }
        Update: {
          created_at?: string
          equipment_id?: string
          id?: string
          nome?: string
          obrigatorio?: boolean
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "equipment_accessories_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_categories: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      equipment_documents: {
        Row: {
          created_at: string
          created_by: string | null
          equipment_id: string
          id: string
          nome: string
          tipo: string | null
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          equipment_id: string
          id?: string
          nome: string
          tipo?: string | null
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          equipment_id?: string
          id?: string
          nome?: string
          tipo?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_documents_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_photos: {
        Row: {
          created_at: string
          created_by: string | null
          descricao: string | null
          equipment_id: string
          id: string
          tipo: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          equipment_id: string
          id?: string
          tipo?: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          equipment_id?: string
          id?: string
          tipo?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_photos_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          conferido_por_id: string | null
          conferido_por_nome: string | null
          created_at: string
          destino: string | null
          equipment_id: string
          id: string
          observacoes: string | null
          resultado: string
          return_id: string | null
        }
        Insert: {
          conferido_por_id?: string | null
          conferido_por_nome?: string | null
          created_at?: string
          destino?: string | null
          equipment_id: string
          id?: string
          observacoes?: string | null
          resultado: string
          return_id?: string | null
        }
        Update: {
          conferido_por_id?: string | null
          conferido_por_nome?: string | null
          created_at?: string
          destino?: string | null
          equipment_id?: string
          id?: string
          observacoes?: string | null
          resultado?: string
          return_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspections_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "returns"
            referencedColumns: ["id"]
          },
        ]
      }
      kit_items: {
        Row: {
          equipment_id: string
          id: string
          kit_id: string
          obrigatorio: boolean
        }
        Insert: {
          equipment_id: string
          id?: string
          kit_id: string
          obrigatorio?: boolean
        }
        Update: {
          equipment_id?: string
          id?: string
          kit_id?: string
          obrigatorio?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "kit_items_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kit_items_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "kits"
            referencedColumns: ["id"]
          },
        ]
      }
      kits: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          unit_id: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          unit_id?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kits_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          unit_id: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          unit_id?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_expenses: {
        Row: {
          comprovante_url: string | null
          created_at: string
          data: string
          descricao: string
          id: string
          maintenance_order_id: string
          valor: number
        }
        Insert: {
          comprovante_url?: string | null
          created_at?: string
          data?: string
          descricao: string
          id?: string
          maintenance_order_id: string
          valor?: number
        }
        Update: {
          comprovante_url?: string | null
          created_at?: string
          data?: string
          descricao?: string
          id?: string
          maintenance_order_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_expenses_maintenance_order_id_fkey"
            columns: ["maintenance_order_id"]
            isOneToOne: false
            referencedRelation: "maintenance_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_orders: {
        Row: {
          conclusao: string | null
          created_at: string
          custo_total: number | null
          diagnostico: string | null
          equipment_id: string
          fotos: Json
          id: string
          inicio: string | null
          numero: string
          observacoes: string | null
          ocorrencia_em: string
          pecas: string | null
          previsao_conclusao: string | null
          prioridade: string
          problema: string
          relatado_por_id: string | null
          relatado_por_nome: string | null
          responsavel_analise: string | null
          solucao: string | null
          status: string
          valor_mao_obra: number | null
          valor_pecas: number | null
        }
        Insert: {
          conclusao?: string | null
          created_at?: string
          custo_total?: number | null
          diagnostico?: string | null
          equipment_id: string
          fotos?: Json
          id?: string
          inicio?: string | null
          numero?: string
          observacoes?: string | null
          ocorrencia_em?: string
          pecas?: string | null
          previsao_conclusao?: string | null
          prioridade?: string
          problema: string
          relatado_por_id?: string | null
          relatado_por_nome?: string | null
          responsavel_analise?: string | null
          solucao?: string | null
          status?: string
          valor_mao_obra?: number | null
          valor_pecas?: number | null
        }
        Update: {
          conclusao?: string | null
          created_at?: string
          custo_total?: number | null
          diagnostico?: string | null
          equipment_id?: string
          fotos?: Json
          id?: string
          inicio?: string | null
          numero?: string
          observacoes?: string | null
          ocorrencia_em?: string
          pecas?: string | null
          previsao_conclusao?: string | null
          prioridade?: string
          problema?: string
          relatado_por_id?: string | null
          relatado_por_nome?: string | null
          responsavel_analise?: string | null
          solucao?: string | null
          status?: string
          valor_mao_obra?: number | null
          valor_pecas?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_orders_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      movements: {
        Row: {
          created_at: string
          destino: string | null
          detalhes: string | null
          equipment_id: string | null
          id: string
          responsavel_id: string | null
          responsavel_nome: string | null
          status: string | null
          tipo: string
        }
        Insert: {
          created_at?: string
          destino?: string | null
          detalhes?: string | null
          equipment_id?: string | null
          id?: string
          responsavel_id?: string | null
          responsavel_nome?: string | null
          status?: string | null
          tipo: string
        }
        Update: {
          created_at?: string
          destino?: string | null
          detalhes?: string | null
          equipment_id?: string | null
          id?: string
          responsavel_id?: string | null
          responsavel_nome?: string | null
          status?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "movements_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          lida: boolean
          mensagem: string | null
          tipo: string
          titulo: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          lida?: boolean
          mensagem?: string | null
          tipo?: string
          titulo: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          lida?: boolean
          mensagem?: string | null
          tipo?: string
          titulo?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ativo: boolean
          created_at: string
          department_id: string | null
          email: string | null
          id: string
          must_change_password: boolean
          nome: string
          telefone: string | null
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          department_id?: string | null
          email?: string | null
          id: string
          must_change_password?: boolean
          nome?: string
          telefone?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          department_id?: string | null
          email?: string | null
          id?: string
          must_change_password?: boolean
          nome?: string
          telefone?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          created_at: string
          equipment_id: string | null
          evento: string
          fim: string
          id: string
          inicio: string
          kit_id: string | null
          local: string | null
          observacoes: string | null
          responsavel_id: string | null
          responsavel_nome: string | null
          status: string
        }
        Insert: {
          created_at?: string
          equipment_id?: string | null
          evento: string
          fim: string
          id?: string
          inicio: string
          kit_id?: string | null
          local?: string | null
          observacoes?: string | null
          responsavel_id?: string | null
          responsavel_nome?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          equipment_id?: string | null
          evento?: string
          fim?: string
          id?: string
          inicio?: string
          kit_id?: string | null
          local?: string | null
          observacoes?: string | null
          responsavel_id?: string | null
          responsavel_nome?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "kits"
            referencedColumns: ["id"]
          },
        ]
      }
      return_items: {
        Row: {
          conferido: boolean
          equipment_id: string
          id: string
          observacao: string | null
          return_id: string
        }
        Insert: {
          conferido?: boolean
          equipment_id: string
          id?: string
          observacao?: string | null
          return_id: string
        }
        Update: {
          conferido?: boolean
          equipment_id?: string
          id?: string
          observacao?: string | null
          return_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_items_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "returns"
            referencedColumns: ["id"]
          },
        ]
      }
      returns: {
        Row: {
          acessorios: Json
          acessorios_faltando: string | null
          assinatura: string | null
          checkout_id: string
          condicao: string
          created_at: string
          devolvido_em: string
          devolvido_por_id: string | null
          devolvido_por_nome: string
          equipment_id: string
          fotos: Json
          id: string
          observacoes: string | null
          recebido_por_nome: string | null
          relato: string | null
          relatorio_ia: string | null
          status: string
        }
        Insert: {
          acessorios?: Json
          acessorios_faltando?: string | null
          assinatura?: string | null
          checkout_id: string
          condicao?: string
          created_at?: string
          devolvido_em?: string
          devolvido_por_id?: string | null
          devolvido_por_nome: string
          equipment_id: string
          fotos?: Json
          id?: string
          observacoes?: string | null
          recebido_por_nome?: string | null
          relato?: string | null
          relatorio_ia?: string | null
          status?: string
        }
        Update: {
          acessorios?: Json
          acessorios_faltando?: string | null
          assinatura?: string | null
          checkout_id?: string
          condicao?: string
          created_at?: string
          devolvido_em?: string
          devolvido_por_id?: string | null
          devolvido_por_nome?: string
          equipment_id?: string
          fotos?: Json
          id?: string
          observacoes?: string | null
          recebido_por_nome?: string | null
          relato?: string | null
          relatorio_ia?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "returns_checkout_id_fkey"
            columns: ["checkout_id"]
            isOneToOne: false
            referencedRelation: "checkouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      technical_assistance: {
        Row: {
          aprovado_por: string | null
          comprovante_url: string | null
          contato: string | null
          created_at: string
          defeito: string | null
          empresa: string
          endereco: string | null
          entregue_por: string | null
          enviado_em: string | null
          equipment_id: string
          fotos: Json
          garantia_servico: string | null
          id: string
          laudo: string | null
          nota_fiscal: string | null
          observacoes: string | null
          orcamento: number | null
          previsao_retorno: string | null
          protocolo: string | null
          retorno_em: string | null
          status: string
          telefone: string | null
          valor_aprovado: number | null
        }
        Insert: {
          aprovado_por?: string | null
          comprovante_url?: string | null
          contato?: string | null
          created_at?: string
          defeito?: string | null
          empresa: string
          endereco?: string | null
          entregue_por?: string | null
          enviado_em?: string | null
          equipment_id: string
          fotos?: Json
          garantia_servico?: string | null
          id?: string
          laudo?: string | null
          nota_fiscal?: string | null
          observacoes?: string | null
          orcamento?: number | null
          previsao_retorno?: string | null
          protocolo?: string | null
          retorno_em?: string | null
          status?: string
          telefone?: string | null
          valor_aprovado?: number | null
        }
        Update: {
          aprovado_por?: string | null
          comprovante_url?: string | null
          contato?: string | null
          created_at?: string
          defeito?: string | null
          empresa?: string
          endereco?: string | null
          entregue_por?: string | null
          enviado_em?: string | null
          equipment_id?: string
          fotos?: Json
          garantia_servico?: string | null
          id?: string
          laudo?: string | null
          nota_fiscal?: string | null
          observacoes?: string | null
          orcamento?: number | null
          previsao_retorno?: string | null
          protocolo?: string | null
          retorno_em?: string | null
          status?: string
          telefone?: string | null
          valor_aprovado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "technical_assistance_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          ativo: boolean
          cidade: string | null
          created_at: string
          endereco: string | null
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          cidade?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          cidade?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_gestor: { Args: { _user_id: string }; Returns: boolean }
      is_membro: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "coordenador" | "operador" | "tecnico"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "coordenador", "operador", "tecnico"],
    },
  },
} as const
