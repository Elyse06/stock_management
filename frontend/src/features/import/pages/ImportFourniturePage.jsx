import { useRef } from "react";
import {
	Alert,
	Box,
	Button,
	Checkbox,
	Chip,
	FormControlLabel,
	LinearProgress,
	Paper,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Typography,
} from "@mui/material";
import {
	CheckCircle as CheckCircleIcon,
	PlayArrow as PlayArrowIcon,
	RestartAlt as RestartAltIcon,
	UploadFile as UploadFileIcon,
} from "@mui/icons-material";
import { useImportFourniture } from "../hooks/useImportFourniture";

export function FournitureImportPage() {
	const fileInputRef = useRef(null);
	const {
		fichier,
		rapport,
		etape,
		loading,
		erreur,
		overwrite,
		setOverwrite,
		ETAPES,
		choisirFichier,
		previsualiser,
		confirmer,
		recommencer,
	} = useImportFourniture();

	const resetAll = () => {
		recommencer();
		choisirFichier(null);
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const handleFileChange = (event) => {
		const selectedFile = event.target.files?.[0];
		if (selectedFile) choisirFichier(selectedFile);
	};

	return (
		<Box sx={{ maxWidth: 1100, mx: "auto", p: { xs: 2, md: 3 } }}>
			<Stack spacing={3}>
				<Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
					<Box
						sx={{
							width: 46,
							height: 46,
							borderRadius: 1.5,
							bgcolor: "#FFF8E1",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							color: "primary.dark",
						}}
					>
						<UploadFileIcon />
					</Box>
					<Box>
						<Typography variant="h5" fontWeight={700}>
							Importer des fournitures
						</Typography>
						<Typography variant="body2" color="text.secondary">
							Intégrez vos fournitures depuis un fichier Excel
						</Typography>
					</Box>
				</Box>

				{erreur && <Alert severity="error">{erreur}</Alert>}

				{etape === ETAPES.CONFIRME && rapport ? (
					<Paper sx={{ p: { xs: 2, sm: 3 }, bgcolor: "#F1F8E9", border: "1px solid #C8E6C9", borderRadius: 2 }}>
						<Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
							<CheckCircleIcon sx={{ color: "#2E7D32", fontSize: 36 }} />
							<Box>
								<Typography variant="h6" fontWeight={700} color="#1B5E20">
									Importation terminée !
								</Typography>
								<Typography variant="body2" color="#2E7D32">
									{rapport.count_total || 0} fourniture(s) traité(s) avec succès.
								</Typography>
							</Box>
						</Box>
						<Box
							sx={{
								display: "grid",
								gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" },
								gap: 2,
							}}
						>
							{[
								["Nouveaux", `+${rapport.lignes_creees || 0}`, "#2E7D32"],
								["Mis à jour", rapport.lignes_maj || 0, "#0288D1"],
								["Ignorés", rapport.lignes_ignorees || 0, "text.secondary"],
								["Erreurs", rapport.lignes_erreur || 0, "#D32F2F"],
							].map(([label, value, color]) => (
								<Paper key={label} sx={{ p: 1.5, textAlign: "center" }}>
									<Typography variant="caption" color="text.secondary">{label}</Typography>
									<Typography variant="h5" fontWeight={700} color={color}>{value}</Typography>
								</Paper>
							))}
						</Box>
						<Button sx={{ mt: 2 }} variant="outlined" startIcon={<RestartAltIcon />} onClick={resetAll}>
							Effectuer un nouvel import
						</Button>
					</Paper>
				) : (
					<Stack spacing={2.5}>
						<Paper
							variant="outlined"
							sx={{
								p: 3,
								textAlign: "center",
								borderRadius: 2,
								borderStyle: "dashed",
								borderWidth: 2,
								borderColor: fichier ? "primary.main" : "#BDBDBD",
								bgcolor: fichier ? "#FFFDE7" : "#FAFAFA",
								cursor: "pointer",
								"&:hover": { borderColor: "primary.dark", bgcolor: "#FFF8E1" },
							}}
							onClick={() => fileInputRef.current?.click()}
						>
							<input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={handleFileChange} />
							<UploadFileIcon sx={{ fontSize: 44, color: "primary.dark", mb: 1 }} />
							<Typography variant="subtitle1" fontWeight={600}>
								{fichier ? fichier.name : "Cliquez pour sélectionner votre fichier Excel"}
							</Typography>
							<Typography variant="caption" color="text.secondary">
								Formats acceptés : .xlsx, .xls, .csv
							</Typography>
						</Paper>

						{loading && <LinearProgress color="primary" />}

						{rapport && etape === ETAPES.APERCU && (
							<Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
								<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5, gap: 1 }}>
									<Typography variant="subtitle1" fontWeight={700}>
										Aperçu ({rapport.lignes_ok || 0} fournitures détectées)
									</Typography>
									<Button size="small" startIcon={<RestartAltIcon />} onClick={resetAll} sx={{ textTransform: "none" }}>
										Changer
									</Button>
								</Box>
								{rapport.date_import && (
									<Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
										Date du mouvement : {rapport.date_import}
									</Typography>
								)}

								{rapport.colonnes_manquantes?.length > 0 && (
									<Alert severity="warning" sx={{ mb: 2 }}>
										Colonnes manquantes : {rapport.colonnes_manquantes.join(", ")}
									</Alert>
								)}

								<TableContainer sx={{ maxHeight: 320 }}>
									<Table size="small" stickyHeader>
										<TableHead>
											<TableRow>
												<TableCell sx={{ fontWeight: 700 }}>Désignation</TableCell>
												<TableCell sx={{ fontWeight: 700 }}>Catégorie</TableCell>
												<TableCell sx={{ fontWeight: 700 }}>Quantité</TableCell>
												<TableCell sx={{ fontWeight: 700 }}>Observation</TableCell>
												<TableCell sx={{ fontWeight: 700 }}>Statut</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{(rapport.details || []).slice(0, 50).map((row, index) => (
												<TableRow key={index} hover>
													<TableCell>
														<Chip label={row.designation || "Auto"} size="small" sx={{ fontWeight: 600, fontSize: 11 }} />
													</TableCell>
													<TableCell>{row.categorie || "-"}</TableCell>
													<TableCell>{row.quantite ?? "-"}</TableCell>
													<TableCell>{row.observation || "-"}</TableCell>
													<TableCell>
														{row.statut && (
															<Chip
																label={row.statut}
																size="small"
																color={row.statut === "ERREUR" ? "error" : row.statut === "IGNORÉ" ? "default" : "success"}
																sx={{ fontSize: 11 }}
															/>
														)}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</TableContainer>

								<Box sx={{ mt: 2, p: 1.5, bgcolor: "#FAFAFA", borderRadius: 1.5 }}>
									<FormControlLabel
										control={
											<Checkbox
												checked={overwrite}
												onChange={(event) => setOverwrite(event.target.checked)}
												color="primary"
												size="small"
											/>
										}
										label={<Typography variant="body2">Mettre à jour les fournitures existantes si la désignation correspond</Typography>}
									/>
								</Box>
							</Paper>
						)}

						<Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
							{etape === ETAPES.CHOIX && fichier && (
								<Button variant="contained" disabled={loading} startIcon={<PlayArrowIcon />} onClick={previsualiser} sx={{ fontWeight: 700, px: 3 }}>
									{loading ? "Analyse..." : "Prévisualiser"}
								</Button>
							)}
							{etape === ETAPES.APERCU && (
								<Button
									variant="contained"
									disabled={loading || (rapport?.lignes_erreur > 0 && rapport?.lignes_ok === 0)}
									startIcon={<CheckCircleIcon />}
									onClick={confirmer}
									sx={{ fontWeight: 700, px: 3 }}
								>
									{loading ? "Importation..." : `Confirmer l'import (${rapport?.lignes_ok || 0})`}
								</Button>
							)}
						</Box>
					</Stack>
				)}
			</Stack>
		</Box>
	);
}
