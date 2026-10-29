import { pool } from '../config/db.js';

const RAW_DATA = `Kemeja Lengan Panjang	TK		1,3					Rp2.000	Rp7.000		Rp500		7	Rp350	7	Rp1.400			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.500	Rp1.500	Rp18.000
Kemeja Lengan Pendek	TK							Rp2.000	Rp7.000		Rp500		5	Rp250	5	Rp1.000			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.000	Rp1.500	Rp17.500
Tunik	TK							Rp2.000	Rp7.500					Rp0		Rp0			Rp400	Rp1.500				Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.500	Rp1.500	Rp18.000
Kurung	TK							Rp2.000	Rp7.500				3	Rp150	3	Rp600			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp15.500	Rp1.500	Rp17.000
Gamis	TK							Rp3.000	Rp10.000					Rp0		Rp0			Rp400	Rp700				Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp19.000	Rp1.500	Rp20.500
Dress	TK							Rp2.000	Rp12.000					Rp0		Rp0			Rp400	Rp1.500				Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp21.000	Rp1.500	Rp22.500
Celana Panjang	TK							Rp2.000	Rp8.000					Rp0		Rp0	Rp350	Rp500	Rp400	Rp700			Rp1.200	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp18.000	Rp1.500	Rp19.500
Celana Pendek	TK							Rp2.000	Rp8.000					Rp0		Rp0	Rp350	Rp500	Rp400	Rp700			Rp1.200	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp18.000	Rp1.500	Rp19.500
Rok Rample Pj	TK							Rp2.000	Rp7.000					Rp0		Rp0	Rp350	Rp500	Rp400	Rp700			Rp1.500	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.500	Rp1.500	Rp19.000
Rok Rample Pk	TK							Rp2.000	Rp7.000					Rp0		Rp0	Rp350	Rp500	Rp400	Rp700			Rp1.500	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.500	Rp1.500	Rp19.000
Kemeja Lengan Panjang	SD							Rp2.000	Rp7.000		Rp500		8	Rp400	8	Rp1.600			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.000	Rp1.500	Rp18.500
Kemeja Lengan Pendek	SD							Rp2.000	Rp7.000		Rp500		5	Rp250	5	Rp1.000			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.000	Rp1.500	Rp17.500
Tunik	SD							Rp2.000	Rp7.500				0	Rp0	0	Rp0			Rp400	Rp1.500				Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.500	Rp1.500	Rp18.000
Kurung	SD							Rp2.000	Rp7.500				4	Rp200	4	Rp800			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.000	Rp1.500	Rp17.500
Gamis	SD							Rp3.000	Rp10.000					Rp0		Rp0			Rp400	Rp700				Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp19.000	Rp1.500	Rp20.500
Dress	SD							Rp3.000	Rp9.000					Rp0		Rp0			Rp400	Rp1.500				Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp19.000	Rp1.500	Rp20.500
Celana Panjang	SD							Rp2.000	Rp8.000					Rp0		Rp0	Rp350	Rp500	Rp400	Rp700			Rp1.200	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp18.000	Rp1.500	Rp19.500
Celana Pendek	SD							Rp2.000	Rp8.000					Rp0		Rp0	Rp350	Rp500	Rp400	Rp700			Rp1.200	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp18.000	Rp1.500	Rp19.500
Rok Rample Pj	SD							Rp2.000	Rp7.000					Rp0		Rp0	Rp350	Rp500	Rp400	Rp700			Rp1.500	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.500	Rp1.500	Rp19.000
Rok Rample Pk	SD							Rp2.000	Rp7.000					Rp0		Rp0	Rp350	Rp500	Rp400	Rp700			Rp1.500	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.500	Rp1.500	Rp19.000
Kemeja Lengan Panjang	SMP							Rp2.000	Rp7.000		Rp500		8	Rp400	8	Rp1.600			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.000	Rp1.500	Rp18.500
Kemeja Lengan Pendek	SMP							Rp2.000	Rp7.000		Rp500		6	Rp300	6	Rp1.200			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.500	Rp1.500	Rp18.000
Tunik	SMP							Rp2.000	Rp7.500					Rp0		Rp0			Rp400	Rp1.500				Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.500	Rp1.500	Rp18.000
Kurung	SMP							Rp2.000	Rp7.500				5	Rp250	5	Rp1.000			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.000	Rp1.500	Rp17.500
Gamis	SMP							Rp3.000	Rp10.000					Rp0		Rp0			Rp400	Rp700				Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp19.000	Rp1.500	Rp20.500
Dress	SMP							Rp2.000	Rp15.000					Rp0		Rp0			Rp400	Rp1.500				Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp24.000	Rp1.500	Rp25.500
PDL	SMP							Rp2.000	Rp7.000		Rp500		11	Rp550	11	Rp2.200			Rp400	Rp1.500				Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp19.000	Rp1.500	Rp20.500
Celana Panjang	SMP							Rp2.000	Rp8.000					Rp0		Rp0	Rp350	Rp500	Rp400	Rp700			Rp1.200	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp18.000	Rp1.500	Rp19.500
Celana Pendek	SMP							Rp2.000	Rp8.000					Rp0		Rp0	Rp350	Rp500	Rp400	Rp700			Rp1.200	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp18.000	Rp1.500	Rp19.500
Rok Rample Pj	SMP							Rp2.000	Rp7.000					Rp0		Rp0	Rp350	Rp500	Rp400	Rp700			Rp1.500	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.500	Rp1.500	Rp19.000
Rok Rample Pk	SMP							Rp2.000	Rp7.000					Rp0		Rp0	Rp350	Rp500	Rp400	Rp700			Rp1.500	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.500	Rp1.500	Rp19.000
Kemeja Lengan Panjang	SMA							Rp2.000	Rp7.000		Rp500		8	Rp400	8	Rp1.600			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.000	Rp1.500	Rp18.500
Kemeja Lengan Pendek	SMA							Rp2.000	Rp7.000		Rp500		6	Rp300	6	Rp1.200			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.500	Rp1.500	Rp18.000
Tunik	SMA							Rp2.000	Rp7.500					Rp0		Rp0			Rp400	Rp1.500				Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.500		Rp16.500
Kurung	SMA							Rp2.000	Rp7.500				5	Rp250	5	Rp1.000			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.000		Rp16.000
Gamis	SMA							Rp2.000	Rp10.000					Rp0		Rp0			Rp400	Rp700				Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp18.000		Rp18.000
Dress	SMA							Rp2.000	Rp15.000					Rp0		Rp0			Rp400	1.500				Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp24.000		Rp24.000
PDL	SMA							Rp2.000	Rp7.000		Rp500		11	Rp550	11	Rp2.200			Rp400				Rp1.200	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp19.000		Rp19.000
Celana Panjang	SMA							Rp3.000	Rp9.000					Rp0		Rp0	Rp350	Rp500	Rp400	Rp700			Rp1.200	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp20.000	Rp1.500	Rp21.500
Celana Pendek	SMA							Rp2.000	Rp8.000					Rp0		Rp0	Rp350	Rp500	Rp400	Rp700			Rp1.200	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp18.000		Rp18.000
Rok Rample Pj	SMA							Rp2.000	Rp7.000					Rp0		Rp0	Rp350	Rp500	Rp400	Rp700			Rp1.500	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.500	Rp1.500	Rp19.000
Rok Rample Pk	SMA							Rp2.000	Rp7.000					Rp0		Rp0	Rp350	Rp500	Rp400	Rp700			Rp1.500	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.500		Rp17.500
BAJU PUTIH Lengan Panjang	SD							Rp2.000	Rp7.000		Rp500		7	Rp350	7	Rp1.400			Rp400		Rp1.000	Rp1.000	Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp20.000	Rp1.500	Rp21.500
BAJU PUTIH Lengan Pendek	SD							Rp2.000	Rp7.000		Rp500		5	Rp250	5	Rp1.000			Rp400		Rp1.000	Rp1.000	Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp19.500	Rp1.500	Rp21.000
BAJU PUTIH Lengan Panjang	SMP							Rp2.000	Rp7.000		Rp500		8	Rp400	8	Rp1.600			Rp400		Rp1.000	Rp1.000	Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp20.000	Rp1.500	Rp21.500
BAJU PUTIH Lengan Pendek	SMP							Rp2.000	Rp7.000		Rp500		6	Rp300	6	Rp1.200			Rp400		Rp1.000	Rp1.000	Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp19.500	Rp1.500	Rp21.000
BAJU PUTIH Lengan Panjang	SMA							Rp2.000	Rp7.000		Rp500		8	Rp400	8	Rp1.600			Rp400		Rp1.000	Rp1.000	Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp20.000	Rp1.500	Rp21.500
BAJU PUTIH Lengan Pendek	SMA							Rp2.000	Rp7.000		Rp500		6	Rp300	6	Rp1.200			Rp400		Rp1.000	Rp1.000	Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp19.500	Rp1.500	Rp21.000
BSY Custom Kemeja Lengan Panjang	TK							Rp2.000	Rp7.000		Rp500		6	Rp300	6	Rp1.200			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.500	Rp1.500	Rp18.000
BSY Custom Kemeja Lengan Pendek	TK							Rp2.000	Rp7.000		Rp500		4	Rp200	4	Rp800			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.000	Rp1.500	Rp17.500
BSY Custom Kemeja Lengan Panjang	SD							Rp2.000	Rp7.000		Rp500		7	Rp350	7	Rp1.400			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.500	Rp1.500	Rp18.000
BSY Custom Kemeja Lengan Pendek	SD							Rp2.000	Rp7.000		Rp500		5	Rp250	5	Rp1.000			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.000	Rp1.500	Rp17.500
BSY Custom Kemeja Lengan Panjang	SMP							Rp2.000	Rp7.000		Rp500		8	Rp400	8	Rp1.600			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.000	Rp1.500	Rp18.500
BSY Custom Kemeja Lengan Pendek	SMP							Rp2.000	Rp7.000		Rp500		6	Rp300	6	Rp1.200			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.500	Rp1.500	Rp18.000
BSY Custom Kemeja Lengan Panjang	SMA							Rp2.000	Rp7.000		Rp500		8	Rp400	8	Rp1.600			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.000	Rp1.500	Rp18.500
BSY Custom Kemeja Lengan Pendek	SMA							Rp2.000	Rp7.000		Rp500		6	Rp300	6	Rp1.200			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.500	Rp1.500	Rp18.000
BSY Custom Kemeja Lengan Panjang	DEWASA							Rp2.000	Rp10.000		Rp500		8	Rp400	8	Rp1.600			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp20.000	Rp1.500	Rp21.500
BSY Custom Kemeja Lengan Pendek	DEWASA							Rp2.000	Rp10.000		Rp500		6	Rp300	6	Rp1.200			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp19.500	Rp1.500	Rp21.000
PLY Custom Kemeja Lengan Panjang	TK							Rp2.000	Rp7.000		Rp500		6	Rp300	6	Rp1.200			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.500	Rp1.500	Rp19.000
PLY Custom Kemeja Lengan Pendek	TK							Rp2.000	Rp7.000		Rp500		4	Rp200	4	Rp800			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.000	Rp1.500	Rp18.500
PLY Custom Kemeja Lengan Panjang	SD							Rp2.000	Rp7.000		Rp500		7	Rp350	7	Rp1.400			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp18.000	Rp1.500	Rp19.500
PLY Custom Kemeja Lengan Pendek	SD							Rp2.000	Rp7.000		Rp500		5	Rp250	5	Rp1.000			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.500	Rp1.500	Rp19.000
PLY Custom Kemeja Lengan Panjang	SMP							Rp2.000	Rp7.000		Rp500		8	Rp400	8	Rp1.600			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp18.000	Rp1.500	Rp19.500
PLY Custom Kemeja Lengan Pendek	SMP							Rp2.000	Rp7.000		Rp500		6	Rp300	6	Rp1.200			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.500	Rp1.500	Rp19.000
PLY Custom Kemeja Lengan Panjang	SMA							Rp2.000	Rp7.000		Rp500		8	Rp400	8	Rp1.600			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp18.000	Rp1.500	Rp19.500
PLY Custom Kemeja Lengan Pendek	SMA							Rp2.000	Rp7.000		Rp500		6	Rp300	6	Rp1.200			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.500	Rp1.500	Rp19.000
PLY Custom Kemeja Lengan Panjang	DEWASA							Rp2.000	Rp10.000		Rp500		8	Rp400	8	Rp1.600			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp21.000	Rp1.500	Rp22.500
PLY Custom Kemeja Lengan Pendek	DEWASA							Rp2.000	Rp10.000		Rp500		6	Rp300	6	Rp1.200			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp20.500	Rp1.500	Rp22.000
TYB Custom Kemeja Lengan Panjang	TK							Rp2.000	Rp7.000		Rp500		6	Rp300	6	Rp1.200			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.500	Rp1.500	Rp19.000
TYB Custom Kemeja Lengan Pendek	TK							Rp2.000	Rp7.000		Rp500		4	Rp200	4	Rp800			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.000	Rp1.500	Rp18.500
TYB Custom Kemeja Lengan Panjang	SD							Rp2.000	Rp7.000		Rp500		7	Rp350	7	Rp1.400			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp18.000	Rp1.500	Rp19.500
TYB Custom Kemeja Lengan Pendek	SD							Rp2.000	Rp7.000		Rp500		5	Rp250	5	Rp1.000			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.500	Rp1.500	Rp19.000
TYB Custom Kemeja Lengan Panjang	SMP							Rp2.000	Rp7.000		Rp500		8	Rp400	8	Rp1.600			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp18.000	Rp1.500	Rp19.500
TYB Custom Kemeja Lengan Pendek	SMP							Rp2.000	Rp7.000		Rp500		6	Rp300	6	Rp1.200			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.500	Rp1.500	Rp19.000
TYB Custom Kemeja Lengan Panjang	SMA							Rp2.000	Rp7.000		Rp500		8	Rp400	8	Rp1.600			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp18.000	Rp1.500	Rp19.500
TYB Custom Kemeja Lengan Pendek	SMA							Rp2.000	Rp7.000		Rp500		6	Rp300	6	Rp1.200			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.500	Rp1.500	Rp19.000
TYB Custom Kemeja Lengan Panjang	DEWASA							Rp2.000	Rp10.000		Rp500		8	Rp400	8	Rp1.600			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp21.000	Rp1.500	Rp22.500
TYB Custom Kemeja Lengan Pendek	DEWASA							Rp2.000	Rp10.000		Rp500		6	Rp300	6	Rp1.200			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp20.500	Rp1.500	Rp22.000
BSY Custom KURUNG Lengan Panjang	TK							Rp2.000	Rp7.500				3	Rp150	3	Rp600			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp15.500	Rp1.500	Rp17.000
BSY Custom KURUNG Lengan Panjang	SD							Rp2.000	Rp7.500				4	Rp200	4	Rp800			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.000	Rp1.500	Rp17.500
BSY Custom KURUNG Lengan Panjang	SMP							Rp2.000	Rp7.500				5	Rp250	5	Rp1.000			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.000	Rp1.500	Rp17.500
BSY Custom KURUNG Lengan Panjang	SMA							Rp2.000	Rp7.500				5	Rp250	5	Rp1.000			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.000	Rp1.500	Rp17.500
BSY Custom KURUNG Lengan Panjang	DEWASA							Rp2.000	Rp7.500				5	Rp250	5	Rp1.000			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.000	Rp1.500	Rp17.500
PLY Custom KURUNG Lengan Panjang	TK							Rp2.000	Rp7.500				3	Rp150	3	Rp600			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.000	Rp1.500	Rp18.500
PLY Custom KURUNG Lengan Panjang	SD							Rp2.000	Rp7.500				4	Rp200	4	Rp800			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.000	Rp1.500	Rp18.500
PLY Custom KURUNG Lengan Panjang	SMP							Rp2.000	Rp7.500				5	Rp250	5	Rp1.000			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.500	Rp1.500	Rp19.000
PLY Custom KURUNG Lengan Panjang	SMA							Rp2.000	Rp7.500				5	Rp250	5	Rp1.000			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.500	Rp1.500	Rp19.000
PLY Custom KURUNG Lengan Panjang	DEWASA							Rp2.000	Rp7.500				5	Rp250	5	Rp1.000			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.500	Rp1.500	Rp19.000
TYB Custom KURUNG Lengan Panjang	TK							Rp2.000	Rp7.500				3	Rp150	3	Rp600			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.000	Rp1.500	Rp18.500
TYB Custom KURUNG Lengan Panjang	SD							Rp2.000	Rp7.500				4	Rp200	4	Rp800			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.000	Rp1.500	Rp18.500
TYB Custom KURUNG Lengan Panjang	SMP							Rp2.000	Rp7.500				5	Rp250	5	Rp1.000			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.500	Rp1.500	Rp19.000
TYB Custom KURUNG Lengan Panjang	SMA							Rp2.000	Rp7.500				5	Rp250	5	Rp1.000			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.500	Rp1.500	Rp19.000
TYB Custom KURUNG Lengan Panjang	DEWASA							Rp2.000	Rp7.500				5	Rp250	5	Rp1.000			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.500	Rp1.500	Rp19.000
BSY Custom GAMIS Lengan Panjang	TK							Rp2.000	Rp10.000					Rp0		Rp0			Rp400	Rp700				Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp18.000	Rp1.500	Rp19.500
BSY Custom GAMIS Lengan Panjang	SD							Rp2.000	Rp10.000					Rp0		Rp0			Rp400	Rp700				Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp18.000	Rp1.500	Rp19.500
BSY Custom GAMIS Lengan Panjang	SMP							Rp2.000	Rp10.000					Rp0		Rp0			Rp400	Rp700				Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp18.000	Rp1.500	Rp19.500
BSY Custom GAMIS Lengan Panjang	SMA							Rp2.000	Rp10.000					Rp0		Rp0			Rp400	Rp700				Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp18.000	Rp1.500	Rp19.500
BSY Custom GAMIS Lengan Panjang	DEWASA							Rp2.000	Rp10.000					Rp0		Rp0			Rp400	Rp700				Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp18.000	Rp1.500	Rp19.500
PLY Custom GAMIS Lengan Panjang	TK							Rp2.000	Rp10.000					Rp0		Rp0			Rp400	Rp700			Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp19.500	Rp1.500	Rp21.000
PLY Custom GAMIS Lengan Panjang	SD							Rp2.000	Rp10.000					Rp0		Rp0			Rp400	Rp700			Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp19.500	Rp1.500	Rp21.000
PLY Custom GAMIS Lengan Panjang	SMP							Rp2.000	Rp10.000					Rp0		Rp0			Rp400	Rp700			Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp19.500	Rp1.500	Rp21.000
PLY Custom GAMIS Lengan Panjang	SMA							Rp2.000	Rp10.000					Rp0		Rp0			Rp400	Rp1.000			Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp19.500	Rp1.500	Rp21.000
PLY Custom GAMIS Lengan Panjang	DEWASA							Rp2.000	Rp10.000					Rp0		Rp0			Rp400	Rp700			Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp19.500	Rp1.500	Rp21.000
TYB Custom GAMIS Lengan Panjang	TK							Rp2.000	Rp10.000					Rp0		Rp0			Rp400	Rp700			Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp19.500	Rp1.500	Rp21.000
TYB Custom GAMIS Lengan Panjang	SD							Rp2.000	Rp10.000					Rp0		Rp0			Rp400	Rp700			Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp19.500	Rp1.500	Rp21.000
TYB Custom GAMIS Lengan Panjang	SMP							Rp2.000	Rp10.000					Rp0		Rp0			Rp400	Rp700			Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp19.500	Rp1.500	Rp21.000
TYB Custom GAMIS Lengan Panjang	SMA							Rp2.000	Rp10.000					Rp0		Rp0			Rp400	Rp700			Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp19.500	Rp1.500	Rp21.000
TYB Custom GAMIS Lengan Panjang	DEWASA							Rp2.000	Rp10.000					Rp0		Rp0			Rp400	Rp700			Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp19.500	Rp1.500	Rp21.000
BSY ROMPI BATIK	TK							Rp2.000	Rp7.000				4	Rp200	4	Rp800			Rp400				Rp700	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.000	Rp1.500	Rp17.500
BSY ROMPI BATIK	SD							Rp2.000	Rp7.000				4	Rp200	4	Rp800			Rp400				Rp700	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.000	Rp1.500	Rp17.500
BSY ROMPI BATIK	SMP							Rp2.000	Rp7.000				4	Rp200	4	Rp800			Rp400				Rp700	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.000	Rp1.500	Rp17.500
BSY ROMPI BATIK	SMA							Rp2.000	Rp7.000				4	Rp200	4	Rp800			Rp400				Rp700	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.000	Rp1.500	Rp17.500
BSY ROMPI BATIK	DEWASA							Rp2.000	Rp7.000				4	Rp200	4	Rp800			Rp400				Rp700	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.000	Rp1.500	Rp17.500
PLY ROMPI BATIK	TK							Rp2.000	Rp7.000				4	Rp200	4	Rp800			Rp400				Rp700	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.000	Rp1.500	Rp17.500
PLY ROMPI BATIK	SD							Rp2.000	Rp7.000				4	Rp200	4	Rp800			Rp400				Rp700	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.000	Rp1.500	Rp17.500
PLY ROMPI BATIK	SMP							Rp2.000	Rp7.000				4	Rp200	4	Rp800			Rp400				Rp700	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.000	Rp1.500	Rp17.500
PLY ROMPI BATIK	SMA							Rp2.000	Rp7.000				4	Rp200	4	Rp800			Rp400				Rp700	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.000	Rp1.500	Rp17.500
PLY ROMPI BATIK	DEWASA							Rp2.000	Rp7.000				4	Rp200	4	Rp800			Rp400				Rp700	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.000	Rp1.500	Rp17.500
TYB ROMPI BATIK	TK							Rp2.000	Rp7.000				4	Rp200	4	Rp800			Rp400				Rp700	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.000	Rp1.500	Rp17.500
TYB ROMPI BATIK	SD							Rp2.000	Rp7.000				4	Rp200	4	Rp800			Rp400				Rp700	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.000	Rp1.500	Rp17.500
TYB ROMPI BATIK	SMP							Rp2.000	Rp7.000				4	Rp200	4	Rp800			Rp400				Rp700	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.000	Rp1.500	Rp17.500
TYB ROMPI BATIK	SMA							Rp2.000	Rp7.000				4	Rp200	4	Rp800			Rp400				Rp700	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.000	Rp1.500	Rp17.500
TYB ROMPI BATIK	DEWASA							Rp2.000	Rp7.000				4	Rp200	4	Rp800			Rp400				Rp700	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.000	Rp1.500	Rp17.500
ROMPI	TK							Rp2.000	Rp7.000				4	Rp200	4	Rp800			Rp400				Rp700	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.000	Rp1.500	Rp17.500
ROMPI	SD							Rp2.000	Rp7.000				4	Rp200	4	Rp800			Rp400				Rp700	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.000	Rp1.500	Rp17.500
ROMPI	SMP							Rp2.000	Rp7.000				4	Rp200	4	Rp800			Rp400				Rp700	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.000	Rp1.500	Rp17.500
ROMPI	SMA							Rp2.000	Rp7.000				4	Rp200	4	Rp800			Rp400				Rp700	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.000	Rp1.500	Rp17.500
ROMPI	DEWASA							Rp2.000	Rp7.000				4	Rp200	4	Rp800			Rp400				Rp700	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.000	Rp1.500	Rp17.500
Kerudung instan	SD							Rp750	Rp2.000	Rp1.000		Rp500				Rp0			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp9.500	Rp1.500	Rp11.000
BSY KOKO BATIK LENGAN PANJANG	TK							Rp2.000	Rp7.000		Rp500		6	Rp300	6	Rp1.200			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.500	Rp1.500	Rp18.000
BSY KOKO BATIK LENGAN PENDEK	TK							Rp2.000	Rp7.000		Rp500		4	Rp200	4	Rp800			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.000		
BSY KOKO BATIK LENGAN PANJANG	SD							Rp2.000	Rp7.000		Rp500		7	Rp350	7	Rp1.400			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.500		
BSY KOKO BATIK LENGAN PENDEK	SD							Rp2.000	Rp7.000		Rp500		5	Rp250	5	Rp1.000			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.000		
BSY KOKO BATIK LENGAN PANJANG	SMP							Rp2.000	Rp7.000		Rp500		8	Rp400	8	Rp1.600			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.000	Rp1.500	Rp18.500
BSY KOKO BATIK LENGAN PENDEK	SMP							Rp2.000	Rp7.000		Rp500		6	Rp300	6	Rp1.200			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.500		
BSY KOKO BATIK LENGAN PANJANG	SMA							Rp2.000	Rp7.000		Rp500		8	Rp400	8	Rp1.600			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.000		
BSY KOKO BATIK LENGAN PENDEK	SMA							Rp2.000	Rp7.000		Rp500		6	Rp300	6	Rp1.200			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.500		
BSY KOKO BATIK LENGAN PANJANG	DEWASA							Rp2.000	Rp7.000		Rp500		8	Rp400	8	Rp1.600			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.000		
BSY KOKO BATIK LENGAN PENDEK	DEWASA							Rp2.000	Rp7.000		Rp500		6	Rp300	6	Rp1.200			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.500		
BSY KOKO LENGAN PANJANG	TK							Rp2.000	Rp7.000		Rp500		6	Rp300	6	Rp1.200			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.500		
BSY KOKO LENGAN PENDEK	TK							Rp2.000	Rp7.000		Rp500		4	Rp200	4	Rp800			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.000		
BSY KOKO LENGAN PANJANG	SD							Rp2.000	Rp7.000		Rp500		7	Rp350	7	Rp1.400			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.500		
BSY KOKO LENGAN PENDEK	SD							Rp2.000	Rp7.000		Rp500		5	Rp250	5	Rp1.000			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.000		
BSY KOKO LENGAN PANJANG	SMP							Rp2.000	Rp7.000		Rp500		8	Rp400	8	Rp1.600			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.000		
BSY KOKO LENGAN PENDEK	SMP							Rp2.000	Rp7.000		Rp500		6	Rp300	6	Rp1.200			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.500		
BSY KOKO LENGAN PANJANG	SMA							Rp2.000	Rp7.000		Rp500		8	Rp400	8	Rp1.600			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.000		
BSY KOKO LENGAN PENDEK	SMA							Rp2.000	Rp7.000		Rp500		6	Rp300	6	Rp1.200			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.500		
BSY KOKO LENGAN PANJANG	DEWASA							Rp2.000	Rp7.000		Rp500		8	Rp400	8	Rp1.600			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.000		
BSY KOKO LENGAN PENDEK	DEWASA							Rp2.000	Rp7.000		Rp500		6	Rp300	6	Rp1.200			Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.500		
-	DEWASA							Rp2.000	Rp7.000		Rp500								Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp15.000		
TYB KOKO	TK							Rp2.000	Rp7.000		Rp500								Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp15.000		
TYB KOKO	SD							Rp2.000	Rp7.000		Rp500								Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp15.000		
TYB KOKO	SMP							Rp2.000	Rp7.000		Rp500								Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp15.000		
TYB KOKO	SMA							Rp2.000	Rp7.000		Rp500								Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp15.000		
TYB KOKO	DEWASA							Rp2.000	Rp7.000		Rp500								Rp400					Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp15.000		
Tunik	DEWASA							Rp2.000	Rp7.500					Rp0		Rp0			Rp400	Rp1.500				Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.500		Rp16.500
BSY Custom TUNIK Lengan Panjang	TK							Rp2.000	Rp7.500					Rp0		Rp0			Rp400	Rp1.500				Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.500	Rp1.500	Rp18.000
BSY Custom TUNIK Lengan Panjang	SD							Rp2.000	Rp7.500					Rp0		Rp0			Rp400	Rp1.500				Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.500	Rp1.500	Rp18.000
BSY Custom TUNIK Lengan Panjang	SMP							Rp2.000	Rp7.500					Rp0		Rp0			Rp400	Rp1.500				Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.500	Rp1.500	Rp18.000
BSY Custom TUNIK Lengan Panjang	SMA							Rp2.000	Rp7.500					Rp0		Rp0			Rp400	Rp1.500				Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.500	Rp1.500	Rp18.000
BSY Custom TUNIK Lengan Panjang	DEWASA							Rp2.000	Rp7.500					Rp0		Rp0			Rp400	Rp1.500				Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp16.500	Rp1.500	Rp18.000
PLY Custom TUNIK Lengan Panjang	TK							Rp2.000	Rp7.500					Rp0		Rp0			Rp400	Rp1.500			Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.500	Rp1.500	Rp19.000
PLY Custom TUNIK Lengan Panjang	SD							Rp2.000	Rp7.500					Rp0		Rp0			Rp400	Rp1.500			Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.500	Rp1.500	Rp19.000
PLY Custom TUNIK Lengan Panjang	SMP							Rp2.000	Rp7.500					Rp0		Rp0			Rp400	Rp1.500			Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.500	Rp1.500	Rp19.000
PLY Custom TUNIK Lengan Panjang	SMA							Rp2.000	Rp7.500					Rp0		Rp0			Rp400	Rp1.500			Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.500	Rp1.500	Rp19.000
PLY Custom TUNIK Lengan Panjang	DEWASA							Rp2.000	Rp7.500					Rp0		Rp0			Rp400	Rp1.500			Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.500	Rp1.500	Rp19.000
TYB Custom TUNIK Lengan Panjang	TK							Rp2.000	Rp7.500					Rp0		Rp0			Rp400	Rp1.500			Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.500	Rp1.500	Rp19.000
TYB Custom TUNIK Lengan Panjang	SD							Rp2.000	Rp7.500					Rp0		Rp0			Rp400	Rp1.500			Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.500	Rp1.500	Rp19.000
TYB Custom TUNIK Lengan Panjang	SMP							Rp2.000	Rp7.500					Rp0		Rp0			Rp400	Rp1.500			Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.500	Rp1.500	Rp19.000
TYB Custom TUNIK Lengan Panjang	SMA							Rp2.000	Rp7.500					Rp0		Rp0			Rp400	Rp1.500			Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.500	Rp1.500	Rp19.000
TYB Custom TUNIK Lengan Panjang	DEWASA							Rp2.000	Rp7.500					Rp0		Rp0			Rp400	Rp1.500			Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.500	Rp1.500	Rp19.000
SETELAN OLAHRAGA LPJ PJ PE LOTO KC	TK																														53000		
SETELAN OLAHRAGA LPJ PJ PE LOTO KC	SD																														57000		
SETELAN OLAHRAGA LPJ PJ PE LOTO KC	SMP																														65000		
SETELAN OLAHRAGA LPJ PJ PE LOTO KC	SMA																														70000		
SETELAN OLAHRAGA LPJ PJ PE DIADORA KC	TK																														60000		
SETELAN OLAHRAGA LPJ PJ PE DIADORA KC	SD																														64000		
SETELAN OLAHRAGA LPJ PJ PE DIADORA KC	SMP																														72000		
SETELAN OLAHRAGA LPJ PJ PE DIADORA KC	SMA																														80000		
SETELAN OLAHRAGA LPJ PJ CTN LOTO KC	TK																														64000		
SETELAN OLAHRAGA LPJ PJ CTN LOTO KC	SD																														71000		
SETELAN OLAHRAGA LPJ PJ CTN LOTO KC	SMP																														78000		
SETELAN OLAHRAGA LPJ PJ CTN LOTO KC	SMA																														85000		
SETELAN OLAHRAGA LPJ PJ CTN DIADORA KC	TK																														69000		
SETELAN OLAHRAGA LPJ PJ CTN DIADORA KC	SD																														76000		
SETELAN OLAHRAGA LPJ PJ CTN DIADORA KC	SMP																														83000		
SETELAN OLAHRAGA LPJ PJ CTN DIADORA KC	SMA																														90000		
SETELAN OLAHRAGA LPK PJ PE LOTO KC	TK																														50000		
SETELAN OLAHRAGA LPK PJ PE LOTO KC	SD																														54000		
SETELAN OLAHRAGA LPK PJ PE LOTO KC	SMP																														62000		
SETELAN OLAHRAGA LPK PJ PE LOTO KC	SMA																														67000		
SETELAN OLAHRAGA LPK PJ PE DIADORA KC	TK																														57000		
SETELAN OLAHRAGA LPK PJ PE DIADORA KC	SD																														61000		
SETELAN OLAHRAGA LPK PJ PE DIADORA KC	SMP																														69000		
SETELAN OLAHRAGA LPK PJ PE DIADORA KC	SMA																														77000		
SETELAN OLAHRAGA LPK PJ CTN LOTO KC	TK																														61000		
SETELAN OLAHRAGA LPK PJ CTN LOTO KC	SD																														68000		
SETELAN OLAHRAGA LPK PJ CTN LOTO KC	SMP																														75000		
SETELAN OLAHRAGA LPK PJ CTN LOTO KC	SMA																														82000		
SETELAN OLAHRAGA LPK PJ CTN DIADORA KC	TK																														66000		
SETELAN OLAHRAGA LPK PJ CTN DIADORA KC	SD																														73000		
SETELAN OLAHRAGA LPK PJ CTN DIADORA KC	SMP																														80000		
SETELAN OLAHRAGA LPK PJ CTN DIADORA KC	SMA																														87000		
SETELAN OLAHRAGA LPK PK PE LOTO KC	TK																														47000		
SETELAN OLAHRAGA LPK PK PE LOTO KC	SD																														51000		
SETELAN OLAHRAGA LPK PK PE LOTO KC	SMP																														59000		
SETELAN OLAHRAGA LPK PK PE LOTO KC	SMA																														64000		
SETELAN OLAHRAGA LPK PK PE DIADORA KC	TK																														54000		
SETELAN OLAHRAGA LPK PK PE DIADORA KC	SD																														58000		
SETELAN OLAHRAGA LPK PK PE DIADORA KC	SMP																														66000		
SETELAN OLAHRAGA LPK PK PE DIADORA KC	SMA																														74000		
SETELAN OLAHRAGA LPK PK CTN LOTO KC	TK																														58000		
SETELAN OLAHRAGA LPK PK CTN LOTO KC	SD																														65000		
SETELAN OLAHRAGA LPK PK CTN LOTO KC	SMP																														72000		
SETELAN OLAHRAGA LPK PK CTN LOTO KC	SMA																														79000		
SETELAN OLAHRAGA LPK PK CTN DIADORA KC	TK																														63000		
SETELAN OLAHRAGA LPK PK CTN DIADORA KC	SD																														70000		
SETELAN OLAHRAGA LPK PK CTN DIADORA KC	SMP																														77000		
SETELAN OLAHRAGA LPK PK CTN DIADORA KC	SMA																														84000		
PDL	DEWASA							Rp4.000	Rp15.000		Rp500		11	Rp550	11	Rp2.200			Rp400			Rp15.000	Rp1.300	Rp500	Rp550	Rp200	Rp800			Rp2.500	Rp43.500		Rp43.500
DASI								Rp500	Rp2.000																						Rp2.500		
CELANA PANJANG	DEWASA							Rp2.000	Rp8.000					Rp0		Rp0	Rp350	Rp500	Rp400	Rp700			Rp1.200	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp18.000	Rp1.500	Rp19.500
CELANA PENDEK	DEWASA							Rp2.000	Rp8.000					Rp0		Rp0	Rp350	Rp500	Rp400	Rp700				Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.000		Rp17.000
ROK RAMPEL PANJANG	DEWASA							Rp2.000	Rp7.000					Rp0		Rp0	Rp350	Rp500	Rp400	Rp700			Rp1.500	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.500	Rp1.500	Rp19.000
ROK RAMPEL PENDEK	DEWASA							Rp2.000	Rp7.000					Rp0		Rp0	Rp350	Rp500	Rp400	Rp700			Rp1.500	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.500		Rp17.500
Rompi Gamis	TK							Rp3.000	Rp12.000		Rp700		5	Rp250	5	Rp1.000			Rp400			Rp700	Rp1.600	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp24.500		
Kemeja Rompi Panjang	TK							Rp2.000	Rp8.000		Rp700		6	Rp300	6	Rp1.200			Rp400			Rp700	Rp1.600	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp20.000		
Kemeja Rompi Pendek	TK							Rp2.000	Rp8.000		Rp700		4	Rp200	4	Rp800			Rp400			Rp700	Rp1.600	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp19.500		
Rompi Gamis	SMA								Rp22.000																								
KEMEJA POLOS CUSTOM Lengan Panjang	TK							Rp2.000	Rp7.000		Rp500		6	Rp300	6	Rp1.200			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.500	Rp1.500	Rp19.000
KEMEJA POLOS CUSTOM Lengan Pendek	TK							Rp2.000	Rp7.000		Rp500		4	Rp200	4	Rp800			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.000	Rp1.500	Rp18.500
KEMEJA POLOS CUSTOM Lengan Panjang	SD							Rp2.000	Rp7.000		Rp500		7	Rp350	7	Rp1.400			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp18.000	Rp1.500	Rp19.500
KEMEJA POLOS CUSTOM Lengan Pendek	SD							Rp2.000	Rp7.000		Rp500		5	Rp250	5	Rp1.000			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.500	Rp1.500	Rp19.000
KEMEJA POLOS CUSTOM Lengan Panjang	SMP							Rp2.000	Rp7.000		Rp500		8	Rp400	8	Rp1.600			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp18.000	Rp1.500	Rp19.500
KEMEJA POLOS CUSTOM Lengan Pendek	SMP							Rp2.000	Rp7.000		Rp500		6	Rp300	6	Rp1.200			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.500	Rp1.500	Rp19.000
KEMEJA POLOS CUSTOM Lengan Panjang	SMA							Rp2.000	Rp7.000		Rp500		8	Rp400	8	Rp1.600			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp18.000	Rp1.500	Rp19.500
KEMEJA POLOS CUSTOM Lengan Pendek	SMA							Rp2.000	Rp7.000		Rp500		6	Rp300	6	Rp1.200			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp17.500	Rp1.500	Rp19.000
KEMEJA POLOS CUSTOM Lengan Panjang	DEWASA							Rp2.000	Rp10.000		Rp500		8	Rp400	8	Rp1.600			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp21.000	Rp1.500	Rp22.500
KEMEJA POLOS CUSTOM Lengan Pendek	DEWASA							Rp2.000	Rp10.000		Rp500		6	Rp300	6	Rp1.200			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp20.500	Rp1.500	Rp22.000
PLY KOKO POLOS PANJANG	TK							Rp2.000	Rp8.000		Rp500		6	Rp300	6	Rp1.200			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp18.500	Rp1.500	Rp20.000
PLY KOKO POLOS PENDEK	TK							Rp2.000	Rp8.000		Rp500		4	Rp200	4	Rp800			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp18.000		
PLY KOKO POLOS PANJANG	SD							Rp2.000	Rp8.000		Rp500		7	Rp350	7	Rp1.400			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp19.000		
PLY KOKO POLOS PENDEK	SD							Rp2.000	Rp8.000		Rp500		5	Rp250	5	Rp1.000			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp18.500		
PLY KOKO POLOS PANJANG	SMP							Rp2.000	Rp8.000		Rp500		8	Rp400	8	Rp1.600			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp19.000	Rp1.500	Rp20.500
PLY KOKO POLOS PENDEK	SMP							Rp2.000	Rp8.000		Rp500		6	Rp300	6	Rp1.200			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp18.500		
PLY KOKO POLOS PANJANG	SMA							Rp2.000	Rp8.000		Rp500		8	Rp400	8	Rp1.600			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp19.000		
PLY KOKO POLOS PENDEK	SMA							Rp2.000	Rp8.000		Rp500		6	Rp300	6	Rp1.200			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp18.500		
PLY KOKO POLOS PANJANG	DEWASA							Rp2.000	Rp8.000		Rp500		8	Rp400	8	Rp1.600			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp19.000		
PLY KOKO POLOS PENDEK	DEWASA							Rp2.000	Rp8.000		Rp500		6	Rp300	6	Rp1.200			Rp400				Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp18.500		
PLY KURUNG POLOS PANJANG	SD							Rp2.000	Rp8.500		Rp500			Rp0		Rp0			Rp400	Rp1.500			Rp1.300	Rp500	Rp550	Rp200	Rp800	Rp150		Rp2.500	Rp19.000	Rp1.500	Rp20.500
Packing																															900		
`;

function cleanNumber(val) {
  if (!val) return 0;
  const num = val.replace(/[^0-9]/g, '');
  return num ? Number(num) : 0;
}

function slugify(text) {
  return text
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function run() {
  const lines = RAW_DATA.trim().split('\n');
  console.log(`Memproses ${lines.length} baris data HPP...`);

  let countHeader = 0;
  let countDetail = 0;

  for (let i = 0; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    const model = (cols[0] || '').trim();
    const size = (cols[1] || '').trim();
    if (!model || model === '-') continue;

    const namaKategori = size ? `${model} (${size})` : model;
    const idKategori = `HPP-${slugify(model)}${size ? '-' + slugify(size) : ''}`;

    // Parsing kolom sesuai posisi di spreadsheet:
    const jasaPotong = cleanNumber(cols[7]);
    const jasaJahit = cleanNumber(cols[8]);
    const bis = cleanNumber(cols[9]);
    const kainKeras = cleanNumber(cols[10]);
    const pita = cleanNumber(cols[11]);
    const kancingQty = cleanNumber(cols[12]) || (cleanNumber(cols[13]) > 0 ? 1 : 0);
    const kancingHarga = cleanNumber(cols[13]);
    const lubangQty = cleanNumber(cols[14]) || (cleanNumber(cols[15]) > 0 ? 1 : 0);
    const lubangHarga = cleanNumber(cols[15]);
    const kancingKait = cleanNumber(cols[16]);
    const karet = cleanNumber(cols[17]);
    const plastik = cleanNumber(cols[18]);
    const sleting = cleanNumber(cols[19]);
    const aksesoris = cleanNumber(cols[20]);
    const bordir = cleanNumber(cols[21]);
    const setrika = cleanNumber(cols[22]);
    const finishing = cleanNumber(cols[23]);
    const listrik = cleanNumber(cols[24]);
    const benang = cleanNumber(cols[25]);
    const dll = cleanNumber(cols[26]);
    const lebelSize = cleanNumber(cols[27]);
    const pressDtf = cleanNumber(cols[28]);
    const bop = cleanNumber(cols[29]);
    const paymentVendor = cleanNumber(cols[30]);
    const biayaPacking = cleanNumber(cols[31]);
    let totalHpp = cleanNumber(cols[32]);

    // Detail jasa & komponen
    const details = [];
    if (jasaPotong > 0) details.push({ nama_jasa: 'Jasa Potong', jumlah: 1, harga: jasaPotong, total: jasaPotong });
    if (jasaJahit > 0) details.push({ nama_jasa: 'Jasa Jahit', jumlah: 1, harga: jasaJahit, total: jasaJahit });
    if (kainKeras > 0) details.push({ nama_jasa: 'Kain Keras', jumlah: 1, harga: kainKeras, total: kainKeras });
    if (bis > 0) details.push({ nama_jasa: 'Bis', jumlah: 1, harga: bis, total: bis });
    if (pita > 0) details.push({ nama_jasa: 'Pita', jumlah: 1, harga: pita, total: pita });
    if (kancingHarga > 0) details.push({ nama_jasa: 'Kancing', jumlah: kancingQty || 1, harga: Math.round(kancingHarga / (kancingQty || 1)), total: kancingHarga });
    if (lubangHarga > 0) details.push({ nama_jasa: 'Jasa Lubang Kancing', jumlah: lubangQty || 1, harga: Math.round(lubangHarga / (lubangQty || 1)), total: lubangHarga });
    if (kancingKait > 0) details.push({ nama_jasa: 'Kancing Kait', jumlah: 1, harga: kancingKait, total: kancingKait });
    if (karet > 0) details.push({ nama_jasa: 'Karet', jumlah: 1, harga: karet, total: karet });
    if (plastik > 0) details.push({ nama_jasa: 'Plastik Packing', jumlah: 1, harga: plastik, total: plastik });
    if (sleting > 0) details.push({ nama_jasa: 'Sleting', jumlah: 1, harga: sleting, total: sleting });
    if (aksesoris > 0) details.push({ nama_jasa: 'Aksesoris', jumlah: 1, harga: aksesoris, total: aksesoris });
    if (bordir > 0) details.push({ nama_jasa: 'Bordir', jumlah: 1, harga: bordir, total: bordir });
    if (setrika > 0) details.push({ nama_jasa: 'Setrika', jumlah: 1, harga: setrika, total: setrika });
    if (finishing > 0) details.push({ nama_jasa: 'Finishing', jumlah: 1, harga: finishing, total: finishing });
    if (listrik > 0) details.push({ nama_jasa: 'Beban Listrik', jumlah: 1, harga: listrik, total: listrik });
    if (benang > 0) details.push({ nama_jasa: 'Benang', jumlah: 1, harga: benang, total: benang });
    if (dll > 0) details.push({ nama_jasa: 'Biaya DLL', jumlah: 1, harga: dll, total: dll });
    if (lebelSize > 0) details.push({ nama_jasa: 'Label Size', jumlah: 1, harga: lebelSize, total: lebelSize });
    if (pressDtf > 0) details.push({ nama_jasa: 'Press DTF', jumlah: 1, harga: pressDtf, total: pressDtf });
    if (bop > 0) details.push({ nama_jasa: 'BOP', jumlah: 1, harga: bop, total: bop });
    if (biayaPacking > 0) details.push({ nama_jasa: 'Biaya Packing', jumlah: 1, harga: biayaPacking, total: biayaPacking });

    // Jika totalHpp kosong, hitung dari detail
    const sumDetail = details.reduce((acc, d) => acc + d.total, 0);
    if (!totalHpp) {
      totalHpp = sumDetail || paymentVendor;
    }

    // Jika details kosong tapi ada totalHpp (seperti Setelan Olahraga)
    if (details.length === 0 && totalHpp > 0) {
      details.push({ nama_jasa: 'Paket Produksi / Vendor', jumlah: 1, harga: totalHpp, total: totalHpp });
    }

    // Simpan Header
    await pool.query(`
      INSERT INTO master_hpp_produk (
        kode_perusahaan, id_kategori_hpp, nama_kategori_hpp, keterangan, total_hpp, status
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        nama_kategori_hpp = VALUES(nama_kategori_hpp),
        total_hpp = VALUES(total_hpp)
    `, [
      'RSG',
      idKategori,
      namaKategori,
      `Standar tarif HPP model ${model} jenjang ${size || '-'}`,
      totalHpp,
      'Aktif'
    ]);
    countHeader++;

    // Simpan Details
    await pool.query('DELETE FROM detail_master_hpp_produk WHERE id_kategori_hpp = ?', [idKategori]);
    for (const d of details) {
      await pool.query(`
        INSERT INTO detail_master_hpp_produk (
          id_kategori_hpp, nama_jasa, jumlah, harga, total
        ) VALUES (?, ?, ?, ?, ?)
      `, [idKategori, d.nama_jasa, d.jumlah, d.harga, d.total]);
      countDetail++;
    }
  }

  console.log(`Selesai! Berhasil import ${countHeader} Master HPP dan ${countDetail} Detail Item.`);
  process.exit(0);
}

run().catch(err => {
  console.error('Error seeding HPP:', err);
  process.exit(1);
});
