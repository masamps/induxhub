
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "categories": {
                  Row: {
                    "id": number,"nome": string,"ordem": number,"slug": string
                  }
                  Insert: {
                    "id"?: never,"nome": string,"ordem"?: number,"slug": string
                  }
                  Update: {
                    "id"?: never,"nome"?: string,"ordem"?: number,"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                },"certifications": {
                  Row: {
                    "arquivo_path": string | null,"company_id": string,"created_at": string,"id": string,"nome": string,"orgao": string | null,"validade": string | null
                  }
                  Insert: {
                    "arquivo_path"?: string | null,"company_id": string,"created_at"?: string,"id"?: string,"nome": string,"orgao"?: string | null,"validade"?: string | null
                  }
                  Update: {
                    "arquivo_path"?: string | null,"company_id"?: string,"created_at"?: string,"id"?: string,"nome"?: string,"orgao"?: string | null,"validade"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "certifications_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"cities": {
                  Row: {
                    "ibge_code": number,"id": number,"nome": string,"slug": string,"uf": string
                  }
                  Insert: {
                    "ibge_code": number,"id"?: never,"nome": string,"slug": string,"uf": string
                  }
                  Update: {
                    "ibge_code"?: number,"id"?: never,"nome"?: string,"slug"?: string,"uf"?: string
                  }
                  Relationships: [
                    
                  ]
                },"companies": {
                  Row: {
                    "ano_fundacao": number | null,"capa_url": string | null,"city_id": number,"cnpj": string,"created_at": string,"descricao": string | null,"email": string | null,"id": string,"logo_url": string | null,"nome_fantasia": string,"premium": boolean,"raio_km": number | null,"razao_social": string,"search_text": string | null,"site": string | null,"slug": string,"tipo": Database["public"]['Enums']["company_type"],"updated_at": string,"whatsapp": string | null
                  }
                  Insert: {
                    "ano_fundacao"?: number | null,"capa_url"?: string | null,"city_id": number,"cnpj": string,"created_at"?: string,"descricao"?: string | null,"email"?: string | null,"id"?: string,"logo_url"?: string | null,"nome_fantasia": string,"premium"?: boolean,"raio_km"?: number | null,"razao_social": string,"search_text"?: never,"site"?: string | null,"slug": string,"tipo": Database["public"]['Enums']["company_type"],"updated_at"?: string,"whatsapp"?: string | null
                  }
                  Update: {
                    "ano_fundacao"?: number | null,"capa_url"?: string | null,"city_id"?: number,"cnpj"?: string,"created_at"?: string,"descricao"?: string | null,"email"?: string | null,"id"?: string,"logo_url"?: string | null,"nome_fantasia"?: string,"premium"?: boolean,"raio_km"?: number | null,"razao_social"?: string,"search_text"?: never,"site"?: string | null,"slug"?: string,"tipo"?: Database["public"]['Enums']["company_type"],"updated_at"?: string,"whatsapp"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "companies_city_id_fkey"
      columns: ["city_id"]
isOneToOne: false
      referencedRelation: "cities"
      referencedColumns: ["id"]
    }
                  ]
                },"company_categories": {
                  Row: {
                    "category_id": number,"company_id": string
                  }
                  Insert: {
                    "category_id": number,"company_id": string
                  }
                  Update: {
                    "category_id"?: number,"company_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_categories_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_categories_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"company_cities": {
                  Row: {
                    "city_id": number,"company_id": string
                  }
                  Insert: {
                    "city_id": number,"company_id": string
                  }
                  Update: {
                    "city_id"?: number,"company_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_cities_city_id_fkey"
      columns: ["city_id"]
isOneToOne: false
      referencedRelation: "cities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_cities_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"company_members": {
                  Row: {
                    "company_id": string,"created_at": string,"role": Database["public"]['Enums']["member_role"],"user_id": string
                  }
                  Insert: {
                    "company_id": string,"created_at"?: string,"role"?: Database["public"]['Enums']["member_role"],"user_id": string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"role"?: Database["public"]['Enums']["member_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_members_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"company_photos": {
                  Row: {
                    "company_id": string,"created_at": string,"id": string,"legenda": string | null,"ordem": number,"storage_path": string,"tipo": Database["public"]['Enums']["photo_kind"]
                  }
                  Insert: {
                    "company_id": string,"created_at"?: string,"id"?: string,"legenda"?: string | null,"ordem"?: number,"storage_path": string,"tipo"?: Database["public"]['Enums']["photo_kind"]
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"id"?: string,"legenda"?: string | null,"ordem"?: number,"storage_path"?: string,"tipo"?: Database["public"]['Enums']["photo_kind"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_photos_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"company_stats": {
                  Row: {
                    "company_id": string,"nota_media": number | null,"projetos_concluidos": number,"total_avaliacoes": number,"updated_at": string
                  }
                  Insert: {
                    "company_id": string,"nota_media"?: number | null,"projetos_concluidos"?: number,"total_avaliacoes"?: number,"updated_at"?: string
                  }
                  Update: {
                    "company_id"?: string,"nota_media"?: number | null,"projetos_concluidos"?: number,"total_avaliacoes"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_stats_company_id_fkey"
      columns: ["company_id"]
isOneToOne: true
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"equipment": {
                  Row: {
                    "capacidade": string | null,"company_id": string,"created_at": string,"id": string,"modelo": string | null,"nome": string,"quantidade": number
                  }
                  Insert: {
                    "capacidade"?: string | null,"company_id": string,"created_at"?: string,"id"?: string,"modelo"?: string | null,"nome": string,"quantidade"?: number
                  }
                  Update: {
                    "capacidade"?: string | null,"company_id"?: string,"created_at"?: string,"id"?: string,"modelo"?: string | null,"nome"?: string,"quantidade"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "equipment_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"key_clients": {
                  Row: {
                    "company_id": string,"id": string,"logo_url": string | null,"nome": string,"ordem": number
                  }
                  Insert: {
                    "company_id": string,"id"?: string,"logo_url"?: string | null,"nome": string,"ordem"?: number
                  }
                  Update: {
                    "company_id"?: string,"id"?: string,"logo_url"?: string | null,"nome"?: string,"ordem"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "key_clients_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"profile_metrics": {
                  Row: {
                    "company_id": string,"dia": string,"orcamentos_recebidos": number,"quote_clicks": number,"views": number,"whatsapp_clicks": number
                  }
                  Insert: {
                    "company_id": string,"dia": string,"orcamentos_recebidos"?: number,"quote_clicks"?: number,"views"?: number,"whatsapp_clicks"?: number
                  }
                  Update: {
                    "company_id"?: string,"dia"?: string,"orcamentos_recebidos"?: number,"quote_clicks"?: number,"views"?: number,"whatsapp_clicks"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "profile_metrics_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"quote_recipients": {
                  Row: {
                    "enviado_em": string,"prestador_id": string,"quote_id": string,"respondido_em": string | null,"visualizado_em": string | null
                  }
                  Insert: {
                    "enviado_em"?: string,"prestador_id": string,"quote_id": string,"respondido_em"?: string | null,"visualizado_em"?: string | null
                  }
                  Update: {
                    "enviado_em"?: string,"prestador_id"?: string,"quote_id"?: string,"respondido_em"?: string | null,"visualizado_em"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "quote_recipients_prestador_id_fkey"
      columns: ["prestador_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quote_recipients_quote_id_fkey"
      columns: ["quote_id"]
isOneToOne: false
      referencedRelation: "quote_requests"
      referencedColumns: ["id"]
    }
                  ]
                },"quote_replies": {
                  Row: {
                    "autor_user_id": string | null,"created_at": string,"id": string,"mensagem": string,"prazo_dias": number | null,"prestador_id": string,"quote_id": string,"valor_estimado": number | null
                  }
                  Insert: {
                    "autor_user_id"?: string | null,"created_at"?: string,"id"?: string,"mensagem": string,"prazo_dias"?: number | null,"prestador_id": string,"quote_id": string,"valor_estimado"?: number | null
                  }
                  Update: {
                    "autor_user_id"?: string | null,"created_at"?: string,"id"?: string,"mensagem"?: string,"prazo_dias"?: number | null,"prestador_id"?: string,"quote_id"?: string,"valor_estimado"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "quote_replies_prestador_id_fkey"
      columns: ["prestador_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quote_replies_quote_id_fkey"
      columns: ["quote_id"]
isOneToOne: false
      referencedRelation: "quote_requests"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quote_replies_quote_id_prestador_id_fkey"
      columns: ["quote_id","prestador_id"]
isOneToOne: true
      referencedRelation: "quote_recipients"
      referencedColumns: ["quote_id","prestador_id"]
    }
                  ]
                },"quote_requests": {
                  Row: {
                    "anexos": (string)[],"category_id": number,"city_id": number,"created_at": string,"criado_por": string | null,"descricao": string,"fechado_em": string | null,"id": string,"prazo_desejado": string | null,"prestador_escolhido_id": string | null,"solicitante_id": string,"status": Database["public"]['Enums']["quote_status"],"titulo": string,"updated_at": string
                  }
                  Insert: {
                    "anexos"?: (string)[],"category_id": number,"city_id": number,"created_at"?: string,"criado_por"?: string | null,"descricao": string,"fechado_em"?: string | null,"id"?: string,"prazo_desejado"?: string | null,"prestador_escolhido_id"?: string | null,"solicitante_id": string,"status"?: Database["public"]['Enums']["quote_status"],"titulo": string,"updated_at"?: string
                  }
                  Update: {
                    "anexos"?: (string)[],"category_id"?: number,"city_id"?: number,"created_at"?: string,"criado_por"?: string | null,"descricao"?: string,"fechado_em"?: string | null,"id"?: string,"prazo_desejado"?: string | null,"prestador_escolhido_id"?: string | null,"solicitante_id"?: string,"status"?: Database["public"]['Enums']["quote_status"],"titulo"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "quote_requests_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quote_requests_city_id_fkey"
      columns: ["city_id"]
isOneToOne: false
      referencedRelation: "cities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quote_requests_prestador_escolhido_id_fkey"
      columns: ["prestador_escolhido_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quote_requests_solicitante_id_fkey"
      columns: ["solicitante_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"reviews": {
                  Row: {
                    "autor_company_id": string,"autor_user_id": string | null,"comentario": string | null,"created_at": string,"id": string,"nota": number,"prestador_id": string,"projeto_descricao": string | null,"quote_id": string,"updated_at": string
                  }
                  Insert: {
                    "autor_company_id": string,"autor_user_id"?: string | null,"comentario"?: string | null,"created_at"?: string,"id"?: string,"nota": number,"prestador_id": string,"projeto_descricao"?: string | null,"quote_id": string,"updated_at"?: string
                  }
                  Update: {
                    "autor_company_id"?: string,"autor_user_id"?: string | null,"comentario"?: string | null,"created_at"?: string,"id"?: string,"nota"?: number,"prestador_id"?: string,"projeto_descricao"?: string | null,"quote_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reviews_autor_company_id_fkey"
      columns: ["autor_company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_prestador_id_fkey"
      columns: ["prestador_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_quote_id_fkey"
      columns: ["quote_id"]
isOneToOne: false
      referencedRelation: "quote_requests"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "bump_metric":
{ Args: { "p_amount"?: number,"p_column": string,"p_company_id": string }; Returns: undefined
                           },
"can_read_quote_attachment":
{ Args: { "p_name": string }; Returns: boolean
                           },
"can_review":
{ Args: { "p_autor_company_id": string,"p_prestador_id": string,"p_quote_id": string }; Returns: boolean
                           },
"close_quote":
{ Args: { "p_prestador_escolhido_id"?: string,"p_quote_id": string }; Returns: undefined
                           },
"create_company":
{ Args: { "p_city_id": number,"p_cnpj": string,"p_email"?: string,"p_nome_fantasia": string,"p_razao_social": string,"p_slug": string,"p_tipo": Database["public"]['Enums']["company_type"],"p_whatsapp"?: string }; Returns: string
                           },
"create_quote_request":
{ Args: { "p_anexos"?: (string)[],"p_category_id": number,"p_city_id": number,"p_descricao": string,"p_prazo_desejado"?: string,"p_solicitante_id": string,"p_titulo": string }; Returns: string
                           },
"f_unaccent":
{ Args: { "value": string }; Returns: string
                           },
"is_member":
{ Args: { "p_company_id": string }; Returns: boolean
                           },
"is_quote_owner":
{ Args: { "p_quote_id": string }; Returns: boolean
                           },
"is_quote_recipient":
{ Args: { "p_quote_id": string }; Returns: boolean
                           },
"is_valid_cnpj":
{ Args: { "cnpj": string }; Returns: boolean
                           },
"mark_quote_viewed":
{ Args: { "p_prestador_id": string,"p_quote_id": string }; Returns: undefined
                           },
"owns_storage_folder":
{ Args: { "p_name": string }; Returns: boolean
                           },
"photo_limit":
{ Args: { "p_premium": boolean }; Returns: number
                           },
"quote_max_recipients":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"refresh_company_stats":
{ Args: { "p_company_id": string }; Returns: undefined
                           },
"set_company_buyer":
{ Args: { "p_company_id": string,"p_enabled": boolean }; Returns: Database["public"]['Enums']["company_type"]
                           },
"reply_to_quote":
{ Args: { "p_mensagem": string,"p_prazo_dias"?: number,"p_prestador_id": string,"p_quote_id": string,"p_valor_estimado"?: number }; Returns: string
                           },
"search_companies":
{ Args: { "p_category_slug"?: string,"p_city_slug"?: string,"p_limit"?: number,"p_offset"?: number,"p_query"?: string,"p_sort"?: string }; Returns: {
              "categorias": (string)[],"cidade": string,"descricao": string,"id": string,"logo_url": string,"nome_fantasia": string,"nota_media": number,"premium": boolean,"projetos_concluidos": number,"slug": string,"total_avaliacoes": number,"total_count": number,"uf": string,"whatsapp": string
            }[]
                           },
"today_local":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"track_event":
{ Args: { "p_company_id": string,"p_event": Database["public"]['Enums']["metric_event"] }; Returns: undefined
                           }
          }
          Enums: {
            "company_type": "contratante"|"prestador"|"ambos","member_role": "owner"|"member","metric_event": "view"|"whatsapp"|"quote_click","photo_kind": "empresa"|"trabalho","quote_status": "aberto"|"respondido"|"fechado"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "company_type": ["contratante", "prestador", "ambos"],"member_role": ["owner", "member"],"metric_event": ["view", "whatsapp", "quote_click"],"photo_kind": ["empresa", "trabalho"],"quote_status": ["aberto", "respondido", "fechado"]
          }
        }
} as const

