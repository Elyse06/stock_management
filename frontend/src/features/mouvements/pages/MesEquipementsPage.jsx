import { useState } from "react";
import { Alert, Box, Button, Checkbox, Chip, Paper, Stack, Typography } from "@mui/material";
import { AssignmentReturn as RetourIcon, SwapHoriz as TransfertIcon } from "@mui/icons-material";

import { EtatBadge } from "@/components/data-display/EtatBadge";
import { SearchField } from "@/components/forms/SearchField";
import { PaginatedDataGrid } from "@/components/table/PaginatedDataGrid";
import { API_ENDPOINTS } from "@/config/endpoints";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePaginatedList } from "@/hooks/usePaginatedList";

import { DEMANDES_KEY } from "../api/demandesUnitesApi";
import { DemandeUniteModal } from "../components/demandes/DemandeUniteModal";
import { MesDemandesTable } from "../components/demandes/MesDemandesTable";
import { peutRetourner, peutTransferer } from "../constants/mouvement";

const peut = { RETOUR: peutRetourner, TRANSFERT: peutTransferer };

export function MesEquipementsPage() {
  const { user } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const [selection, setSelection] = useState(() => new Set());
  const [modal, setModal] = useState(null); // { type, unites }
  const search = useDebouncedValue(searchInput.trim());
  const liste = usePaginatedList([...DEMANDES_KEY, "mes-unites"], API_ENDPOINTS.MES_UNITES, { search });
  const lignes = liste.rows;
  const choisies = lignes.filter((u) => selection.has(u.unite_id));

  const basculer = (id) =>
    setSelection((s) => {
      const suivant = new Set(s);
      if (suivant.has(id)) suivant.delete(id);
      else suivant.add(id);
      return suivant;
    });
  const ouvrir = (type, unites) => {
    const eligibles = unites.filter((u) => !u.demande_en_attente && peut[type](u));
    if (eligibles.length) setModal({ type, unites: eligibles });
  };

  const columns = [
    {
      field: "selection", headerName: "", sortable: false, autoGrow: false, autoExtraWidth: 8, getText: () => "",
      renderCell: ({ row }) => (
        <Checkbox size="small" checked={selection.has(row.unite_id)} disabled={Boolean(row.demande_en_attente)}
          onChange={() => basculer(row.unite_id)} slotProps={{ input: { "aria-label": `Sélectionner ${row.article_designation} ${row.numero_de_serie || ""}` } }} />
      ),
    },
    {
      field: "article_designation", headerName: "Équipement", getText: (r) => `${r.article_designation} ${r.numero_de_serie || ""}`,
      renderCell: ({ row }) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" noWrap>{row.article_designation}</Typography>
          <Typography variant="caption" color="text.secondary" fontFamily="monospace">
            {row.article_code}{row.numero_de_serie && ` · N° ${row.numero_de_serie}`}
          </Typography>
        </Box>
      ),
    },
    { field: "etat", headerName: "État", autoGrow: false, autoExtraWidth: 56, renderCell: ({ value }) => <EtatBadge etat={value} /> },
    {
      field: "a_moi", headerName: "Attribué à", autoExtraWidth: 40,
      getText: (r) => (r.a_moi ? "Moi" : `Direction : ${r.employe_attribue_nom}`),
      renderCell: ({ row }) => <Chip size="small" variant="outlined" color={row.a_moi ? "primary" : "default"}
        label={row.a_moi ? "Moi" : `Direction : ${row.employe_attribue_nom}`} />,
    },
    {
      field: "demande_en_attente", headerName: "Demande", sortable: false, autoExtraWidth: 90,
      getText: (r) => {
        const d = r.demande_en_attente;
        return d ? `${d.type_label} demandé${d.de_moi ? "" : ` par ${d.demandeur_nom}`}` : "Retour Transfert";
      },
      renderCell: ({ row }) => {
        const d = row.demande_en_attente;
        if (d) return <Chip size="small" color="warning" variant="outlined"
          label={`${d.type_label} demandé${d.de_moi ? "" : ` par ${d.demandeur_nom}`}`} />;
        return (
          <Stack direction="row" spacing={0.5}>
            <Button size="small" startIcon={<RetourIcon fontSize="small" />} disabled={!peutRetourner(row)} onClick={() => ouvrir("RETOUR", [row])}>Retour</Button>
            <Button size="small" startIcon={<TransfertIcon fontSize="small" />} disabled={!peutTransferer(row)} onClick={() => ouvrir("TRANSFERT", [row])}>Transfert</Button>
          </Stack>
        );
      },
    },
  ];

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h2" component="h1">Mes équipements</Typography>
      </Box>
      {!user?.employe && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Votre compte n'est rattaché à aucun employé : demandez à l'administrateur de le rattacher à votre fiche.
        </Alert>
      )}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center", mb: 1.5 }}>
          <SearchField value={searchInput} onChange={setSearchInput} placeholder="Équipement..." minWidth={240} />
          {choisies.length > 0 && (
            <Stack direction="row" spacing={1} sx={{ ml: { sm: "auto" } }}>
              <Button variant="outlined" startIcon={<RetourIcon />} onClick={() => ouvrir("RETOUR", choisies)}>
                Demander le retour ({choisies.filter((u) => peutRetourner(u)).length})
              </Button>
              <Button variant="contained" startIcon={<TransfertIcon />} onClick={() => ouvrir("TRANSFERT", choisies)}>
                Demander le transfert ({choisies.filter((u) => peutTransferer(u)).length})
              </Button>
            </Stack>
          )}
        </Box>
        <PaginatedDataGrid {...liste.gridProps} columns={columns} getRowId={(r) => r.unite_id}
          noRowsLabel="Aucun équipement ne vous est attribué" aria-label="Mes équipements" />
      </Paper>
      <MesDemandesTable />
      {modal && (
        <DemandeUniteModal type={modal.type} unites={modal.unites} isOpen onClose={() => setModal(null)}
          onTermine={() => { setModal(null); setSelection(new Set()); }} />
      )}
    </Box>
  );
}
