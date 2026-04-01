/**
 * =============================================================================
 * 📦 Model: Document
 * Path: src/models/Document.ts
 * =============================================================================
 *
 * ES:
 *   Modelo administrable para documentos y archivos reutilizables del sitio.
 *
 *   Propósito:
 *   - Centralizar documentos públicos, privados e internos en una sola entidad.
 *   - Permitir asociación con módulos como Services, Projects y Client Portal.
 *   - Soportar archivos descargables, miniaturas y metadatos editoriales.
 *
 *   Casos de uso:
 *   - PDFs técnicos de servicios
 *   - fichas comerciales
 *   - catálogos
 *   - manuales
 *   - documentos privados para clientes
 *
 *   Reglas:
 *   - fileUrl es obligatorio y representa la ubicación pública o controlada del archivo.
 *   - title mantiene estructura bilingüe estable.
 *   - visibility controla acceso esperado del documento.
 *   - relatedModule y relatedEntityId permiten vinculación flexible con otros módulos.
 *   - order permite orden manual cuando el documento se muestra en listados.
 *   - status controla si el documento está visible o no en la UI.
 *
 * EN:
 *   Manageable model for reusable documents and files across the site.
 * =============================================================================
 */

import mongoose, {
  Schema,
  type InferSchemaType,
  type Model,
  Types,
} from "mongoose";

/* -------------------------------------------------------------------------- */
/* Shared sub-schemas                                                         */
/* -------------------------------------------------------------------------- */

const LocalizedTextSchema = new Schema(
  {
    es: { type: String, default: "", trim: true },
    en: { type: String, default: "", trim: true },
  },
  { _id: false }
);

/* -------------------------------------------------------------------------- */
/* Main schema                                                                */
/* -------------------------------------------------------------------------- */

const DocumentSchema = new Schema(
  {
    title: {
      type: LocalizedTextSchema,
      required: true,
      default: () => ({ es: "", en: "" }),
    },

    description: {
      type: LocalizedTextSchema,
      default: () => ({ es: "", en: "" }),
    },

    /**
     * ES:
     * - Tipo lógico/editorial del documento.
     * - Útil para agrupar por intención de uso.
     *
     * Ejemplos:
     * - pdf
     * - brochure
     * - datasheet
     * - manual
     * - certificate
     * - image
     *
     * EN:
     * - Logical/editorial document type.
     */
    type: {
      type: String,
      required: true,
      default: "pdf",
      trim: true,
      lowercase: true,
    },

    /**
     * ES:
     * - URL o path resoluble del archivo principal.
     * - Puede apuntar a storage externo o ruta servida por el proyecto.
     *
     * EN:
     * - Resolvable URL or path for the main file.
     */
    fileUrl: {
      type: String,
      required: true,
      default: "",
      trim: true,
    },

    /**
     * ES:
     * - Nombre original del archivo subido.
     *
     * EN:
     * - Original uploaded file name.
     */
    fileName: {
      type: String,
      default: "",
      trim: true,
    },

    /**
     * ES:
     * - MIME type del archivo.
     * - Ejemplo: application/pdf
     *
     * EN:
     * - File MIME type.
     */
    mimeType: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    /**
     * ES:
     * - Tamaño en bytes, si se conoce.
     *
     * EN:
     * - File size in bytes, when known.
     */
    fileSizeBytes: {
      type: Number,
      min: 0,
      default: 0,
    },

    /**
     * ES:
     * - Miniatura opcional para listados.
     *
     * EN:
     * - Optional thumbnail for listings.
     */
    thumbnailUrl: {
      type: String,
      default: "",
      trim: true,
    },

    /**
     * ES:
     * - Idioma principal del documento.
     *
     * EN:
     * - Primary document language.
     */
    language: {
      type: String,
      enum: ["es", "en", "both", "other"],
      required: true,
      default: "es",
    },

    /**
     * ES:
     * - Categoría editorial/operativa del documento.
     *
     * EN:
     * - Editorial/operational category.
     */
    category: {
      type: String,
      default: "general",
      trim: true,
      lowercase: true,
    },

    /**
     * ES:
     * - Módulo principal al que pertenece o desde el que se administra.
     *
     * Ejemplos:
     * - services
     * - projects
     * - policies
     * - client-portal
     * - general
     *
     * EN:
     * - Primary module this document belongs to.
     */
    relatedModule: {
      type: String,
      default: "general",
      trim: true,
      lowercase: true,
    },

    /**
     * ES:
     * - Referencia flexible a la entidad relacionada.
     * - Se mantiene como ObjectId opcional sin forzar un ref único,
     *   porque puede apuntar a distintas colecciones según relatedModule.
     *
     * EN:
     * - Flexible related entity reference.
     */
    relatedEntityId: {
      type: Schema.Types.ObjectId,
      default: null,
    },

    /**
     * ES:
     * - Visibilidad esperada del documento.
     * - public   → visible públicamente
     * - private  → visible a clientes autenticados/autorizados
     * - internal → solo uso administrativo
     *
     * EN:
     * - Expected document visibility.
     */
    visibility: {
      type: String,
      enum: ["public", "private", "internal"],
      required: true,
      default: "public",
    },

    /**
     * ES:
     * - Estado editorial/publicación del documento.
     *
     * EN:
     * - Editorial/publication status.
     */
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      required: true,
      default: "published",
    },

    /**
     * ES:
     * - Orden manual para listados.
     *
     * EN:
     * - Manual order for listings.
     */
    order: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },

    /**
     * ES:
     * - Marca opcional para destacar documentos.
     *
     * EN:
     * - Optional flag for highlighted documents.
     */
    featured: {
      type: Boolean,
      default: false,
    },

    /**
     * ES:
     * - Fecha visible de carga/publicación documental.
     *
     * EN:
     * - Visible document upload/publication date.
     */
    uploadedAt: {
      type: Date,
      default: Date.now,
    },

    updatedBy: {
      type: String,
      default: "",
      trim: true,
    },

    updatedByEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },
  },
  {
    timestamps: true,
    collection: "Document",
    minimize: false,
    versionKey: false,
  }
);

/* -------------------------------------------------------------------------- */
/* Indexes                                                                    */
/* -------------------------------------------------------------------------- */

DocumentSchema.index({ status: 1, visibility: 1, order: 1 });
DocumentSchema.index({ relatedModule: 1, status: 1, order: 1 });
DocumentSchema.index({ relatedEntityId: 1, relatedModule: 1 });
DocumentSchema.index({ category: 1, visibility: 1, status: 1 });
DocumentSchema.index({ featured: 1, status: 1, order: 1 });
DocumentSchema.index({ uploadedAt: -1 });

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type DocumentDocument = InferSchemaType<typeof DocumentSchema> & {
  _id: Types.ObjectId;
};

type DocumentModel = Model<DocumentDocument>;

/* -------------------------------------------------------------------------- */
/* Export                                                                     */
/* -------------------------------------------------------------------------- */

const DocumentModelInstance =
  (mongoose.models.Document as DocumentModel | undefined) ||
  mongoose.model<DocumentDocument, DocumentModel>("Document", DocumentSchema);

export default DocumentModelInstance;