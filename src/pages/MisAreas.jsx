import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import useFetch from "../hooks/useFetch.js"
import CardAreas from "../components/MisAreas/CardAreas.jsx"
import storeAuth from '../context/storeAuth.jsx'

const MisAreas = () => {
    const navigate = useNavigate()
    const { fetchDataBackend } = useFetch()
    const [empresasCreadas, setEmpresasCreadas] = useState([])
    const [empresaUnida, setEmpresaUnida] = useState([])
    const [selectedEmpresa, setSelectedEmpresa] = useState(null)
    const [codigoGenerado, setCodigoGenerado] = useState("")
    const [userRole, setUserRole] = useState(null)
    const [userId, setUserId] = useState(null)

    useEffect(() => {
        loadUserData()
    }, [])

    // 🔧 FUNCIÓN PARA LIMPIAR TOKENS CORRUPTOS
    const clearTokensIfCorrupt = () => {
        try {
            const token = localStorage.getItem('token') || storeAuth.getState().token
            if (token) {
                const tokenPayload = JSON.parse(atob(token.split('.')[1]))
                console.log('🔍 Verificando validez del token:', tokenPayload)
                
                // Si hay inconsistencias, limpiar tokens
                if (!tokenPayload.rol || !tokenPayload.id) {
                    console.log('🧹 Token inválido, limpiando...')
                    localStorage.removeItem('token')
                    storeAuth.getState().setToken(null)
                    return null
                }
                return token
            }
        } catch (error) {
            console.log('🧹 Error parseando token, limpiando...')
            localStorage.removeItem('token')
            storeAuth.getState().setToken(null)
            return null
        }
        return null
    }

    // 🔍 FUNCIÓN CON DEBUG DETALLADO
    const loadUserData = async () => {
        try {
            console.log('🚀 INICIANDO loadUserData...')
            
            // ✅ VERIFICAR Y LIMPIAR TOKEN SI ESTÁ CORRUPTO
            const token = clearTokensIfCorrupt()
            
            console.log('🔑 Token from localStorage:', localStorage.getItem('token') ? 'SÍ' : 'NO')
            console.log('🔑 Token from store:', storeAuth.getState().token ? 'SÍ' : 'NO')
            console.log('🔑 Token final usado:', token ? 'SÍ' : 'NO')
            console.log('🔑 Token length:', token?.length || 0)
            
            if (token) {
                try {
                    const tokenPayload = JSON.parse(atob(token.split('.')[1]))
                    
                    // 🔍 DEBUG EXTENDIDO DEL TOKEN
                    console.log('👤 TOKEN PAYLOAD COMPLETO:', tokenPayload)
                    console.log('🔍 ROL USUARIO:', tokenPayload.rol)
                    console.log('🔍 ID USUARIO:', tokenPayload.id)
                    console.log('🔍 EMPRESA ID EN TOKEN:', tokenPayload.empresaId)
                    console.log('🕐 TOKEN EXP:', new Date(tokenPayload.exp * 1000))
                    console.log('🕐 TOKEN IAT:', new Date(tokenPayload.iat * 1000))
                    
                    // ✅ VERIFICAR SI EL TOKEN HA EXPIRADO
                    const now = Date.now() / 1000
                    if (tokenPayload.exp < now) {
                        console.log('⏰ TOKEN EXPIRADO, limpiando...')
                        localStorage.removeItem('token')
                        storeAuth.getState().setToken(null)
                        setUserRole(null)
                        setUserId(null)
                        return
                    }
                    
                    setUserRole(tokenPayload.rol)
                    setUserId(tokenPayload.id)
                    
                    // ✅ SINCRONIZAR: Si tenemos token en store pero no en localStorage, guardarlo
                    if (!localStorage.getItem('token') && storeAuth.getState().token) {
                        console.log('🔄 Sincronizando token del store al localStorage')
                        localStorage.setItem('token', storeAuth.getState().token)
                    }
                } catch (tokenError) {
                    console.error('❌ Error parsing token:', tokenError)
                    // Limpiar token corrupto
                    localStorage.removeItem('token')
                    storeAuth.getState().setToken(null)
                    setUserRole(null)
                    setUserId(null)
                    return
                }
            } else {
                console.log('❌ NO HAY TOKEN VÁLIDO')
                setUserRole(null)
                setUserId(null)
                return
            }

            // 🔍 LLAMADA AL BACKEND CON DEBUG DETALLADO
            console.log('🌐 Haciendo llamada a /mis-empresas...')
            
            try {
                const empresasData = await fetchDataBackend(
                    'http://localhost:8080/api/empresa/mis-empresas', 
                    null, 
                    'GET'
                )
                
                console.log('📦 RESPUESTA COMPLETA del backend:')
                console.log('- Type:', typeof empresasData)
                console.log('- Is Array:', Array.isArray(empresasData))
                console.log('- Length:', empresasData?.length || 0)
                console.log('- Content:', JSON.stringify(empresasData, null, 2))
                
                if (Array.isArray(empresasData) && empresasData.length > 0) {
                    // ✅ USAR EL TOKEN CORRECTO PARA OBTENER EL ROL
                    const currentToken = token // Ya tenemos el token correcto de arriba
                    const tokenPayload = currentToken ? JSON.parse(atob(currentToken.split('.')[1])) : {}
                    
                    console.log('🎯 Procesando empresas según rol...')
                    console.log('- Rol del usuario:', tokenPayload.rol)
                    
                    if (tokenPayload?.rol === 'jefe') {
                        console.log('👔 USUARIO ES JEFE - Asignando a empresasCreadas')
                        setEmpresasCreadas(empresasData)
                        setEmpresaUnida([])
                    } else if (tokenPayload?.rol === 'empleado') {
                        console.log('👷 USUARIO ES EMPLEADO - Asignando a empresaUnida')
                        setEmpresasCreadas([])
                        setEmpresaUnida(empresasData)
                    } else {
                        console.log('❓ USUARIO SIN ROL DEFINIDO')
                        setEmpresasCreadas([])
                        setEmpresaUnida([])
                    }
                } else {
                    console.log('📭 No hay empresas o respuesta vacía')
                    setEmpresasCreadas([])
                    setEmpresaUnida([])
                }
            } catch (fetchError) {
                console.error('❌ ERROR en fetchDataBackend:', fetchError)
                console.error('❌ ERROR message:', fetchError.message)
                console.error('❌ ERROR stack:', fetchError.stack)
                
                // Si el error es 401, probablemente el token sea inválido
                if (fetchError.message?.includes('401')) {
                    console.log('🧹 Error 401, limpiando token...')
                    localStorage.removeItem('token')
                    storeAuth.getState().setToken(null)
                    setUserRole(null)
                    setUserId(null)
                }
                
                setEmpresasCreadas([])
                setEmpresaUnida([])
            }
        } catch (error) {
            console.error('❌ ERROR GENERAL en loadUserData:', error)
        }
    }

    // 🔧 FUNCIÓN PARA FORZAR REFRESH DEL TOKEN
    const forceTokenRefresh = () => {
        console.log('🔄 FORZANDO REFRESH DE TOKEN...')
        localStorage.removeItem('token')
        storeAuth.getState().setToken(null)
        setUserRole(null)
        setUserId(null)
        setEmpresasCreadas([])
        setEmpresaUnida([])
        
        // Redirigir al login para obtener un token fresco
        navigate('/login')
    }

    // Función para seleccionar empresa y navegar (solo para jefes)
    const handleSelectJefe = async (id) => {
        try {
            const res = await fetchDataBackend(
                "http://localhost:8080/api/empresa/seleccionar/" + id,
                null,
                "POST"
            )
            // Guarda el nuevo token en localStorage y store
            if (res.token) {
                localStorage.setItem("token", res.token)
                storeAuth.getState().setToken(res.token)
                console.log('✅ Token actualizado después de seleccionar empresa')
            }
            navigate(`/dashboard/bienvenida-area/${id}`)
        } catch (error) {
            console.error('Error al seleccionar empresa:', error)
        }
    }

    // Función para empleados: Navegar directamente sin seleccionar
    const handleSelectEmpleado = (empresaId) => {
        console.log('👷 EMPLEADO navegando a empresa:', empresaId)
        navigate(`/dashboard/bienvenida-area/${empresaId}`)
    }

    // Función para generar código (solo para jefes)
    const handleGenerarCodigo = async (id) => {
        try {
            // Primero seleccionar la empresa
            const resSeleccion = await fetchDataBackend(
                "http://localhost:8080/api/empresa/seleccionar/" + id,
                null,
                "POST"
            )
            if (resSeleccion.token) {
                localStorage.setItem("token", resSeleccion.token)
                storeAuth.getState().setToken(resSeleccion.token)
            }

            // Luego generar el código
            const res = await fetchDataBackend(
                "http://localhost:8080/api/empresa/generar-invitacion",
                null,
                "PUT"
            )
            setCodigoGenerado(res.codigo)
        } catch (error) {
            console.error('Error al generar código:', error)
        }
    }

    // 🔍 DEBUG EN EL RENDER
    console.log('🎨 RENDER STATE:')
    console.log('- userRole:', userRole)
    console.log('- empresasCreadas.length:', empresasCreadas.length)
    console.log('- empresaUnida.length:', empresaUnida.length)
    console.log('- empresasCreadas:', empresasCreadas)
    console.log('- empresaUnida:', empresaUnida)

    return (
        <div>
            <h1 className='font-black text-4xl text-gray-500'>Mis Áreas</h1>
            <hr className='my-4'/>
            
            {/* 🔍 DEBUG INFO MEJORADO */}
            <div className="mb-4 p-4 bg-gray-100 rounded border text-sm">
                <h3 className="font-bold mb-2">🔍 DEBUG INFO:</h3>
                <p>User Role: <strong>{userRole || 'undefined'}</strong></p>
                <p>User ID: <strong>{userId || 'undefined'}</strong></p>
                <p>Empresas Creadas: <strong>{empresasCreadas.length}</strong></p>
                <p>Empresa Unida: <strong>{empresaUnida.length}</strong></p>
                <p>Token exists: <strong>{localStorage.getItem('token') ? 'SÍ' : 'NO'}</strong></p>
                {empresasCreadas.length > 0 && (
                    <p>Empresas Creadas Data: <code>{JSON.stringify(empresasCreadas.map(e => e.nombre))}</code></p>
                )}
                {empresaUnida.length > 0 && (
                    <p>Empresa Unida Data: <code>{JSON.stringify(empresaUnida.map(e => e.nombre))}</code></p>
                )}
                <div className="mt-2">
                    <button
                        onClick={forceTokenRefresh}
                        className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600"
                    >
                        🔄 Refresh Token
                    </button>
                    <button
                        onClick={loadUserData}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600 ml-2"
                    >
                        🔄 Reload Data
                    </button>
                </div>
            </div>
            
            {/* Mostrar empresas creadas solo si el usuario es jefe y tiene empresas */}
            {userRole === 'jefe' && empresasCreadas.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-[#1976D2] mb-2">Empresas que has creado</h2>
                    <CardAreas 
                        areas={empresasCreadas} 
                        onSelect={handleSelectJefe}
                        onChange={loadUserData}
                        isEmployee={false}
                    />
                </div>
            )}

            {/* Mostrar empresa donde es empleado */}
            {userRole === 'empleado' && empresaUnida.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-[#00C853] mb-2">Tu empresa</h2>
                    <CardAreas 
                        areas={empresaUnida} 
                        onSelect={handleSelectEmpleado}
                        onChange={loadUserData}
                        isEmployee={true}
                    />
                </div>
            )}

            {/* Mensaje cuando no hay empresas */}
            {empresasCreadas.length === 0 && empresaUnida.length === 0 && (
                <div className="text-center py-12">
                    <div className="text-6xl mb-4">🏢</div>
                    <h3 className="text-xl font-bold text-[#1976D2] mb-2">No tienes áreas de trabajo</h3>
                    <p className="text-gray-600 mb-4">
                        {userRole === 'jefe' 
                            ? 'Puedes crear una nueva área de trabajo o unirte a una existente.'
                            : userRole === 'empleado'
                            ? 'No se encontraron áreas de trabajo asignadas.'
                            : 'Inicia sesión para ver tus áreas de trabajo.'
                        }
                    </p>
                    <div className="flex gap-4 justify-center">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="bg-[#1976D2] text-white px-6 py-2 rounded-lg hover:bg-[#00C853] transition-colors"
                        >
                            Ir al Dashboard
                        </button>
                        <button
                            onClick={loadUserData}
                            className="bg-[#00C853] text-white px-6 py-2 rounded-lg hover:bg-[#1976D2] transition-colors"
                        >
                            🔄 Recargar
                        </button>
                        <button
                            onClick={forceTokenRefresh}
                            className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors"
                        >
                            🔄 Login Nuevo
                        </button>
                    </div>
                </div>
            )}

            {/* Modal para generar código */}
            {selectedEmpresa && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-96 max-w-md shadow-2xl relative">
                        <button
                            className="absolute top-2 right-2 text-gray-500 hover:text-[#1976D2] text-xl"
                            onClick={() => setSelectedEmpresa(null)}
                        >✕</button>
                        <h3 className="text-xl font-bold text-[#1976D2] mb-2">{selectedEmpresa.nombre}</h3>
                        <p className="text-gray-600 mb-2">{selectedEmpresa.descripcion}</p>
                        <button
                            className="bg-[#00C853] text-white px-3 py-2 rounded hover:bg-[#1976D2] transition"
                            onClick={() => handleGenerarCodigo(selectedEmpresa._id)}
                        >
                            Generar código de invitación
                        </button>
                        {codigoGenerado && (
                            <div className="mt-4 text-[#1976D2] font-bold text-center">
                                Código generado: <span className="bg-[#B9F6CA] px-2 py-1 rounded">{codigoGenerado}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default MisAreas